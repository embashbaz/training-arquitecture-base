// apps/backend/src/notifications/notifications.service.ts
import { Injectable, ForbiddenException, HttpException, HttpStatus, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role, NotificationStatus, Prisma } from '@prisma/client';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  // Helper to fetch the current user's groups to check Manager scope
  private async getUserGroupIds(userId: string): Promise<string[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { groups: { select: { id: true } } },
    });
    return user?.groups.map((g) => g.id) || [];
  }

  async create(creatorId: string, creatorRole: Role, data: { title: string; body: string; groupId?: string; userId?: string }) {
    if (creatorRole === Role.USER) {
      throw new ForbiddenException('Users cannot create notifications');
    }

    const managerGroupIds = creatorRole === Role.MANAGER ? await this.getUserGroupIds(creatorId) : [];

    // --- CASE 1: TARGETING A GROUP ---
    if (data.groupId) {
      if (creatorRole === Role.MANAGER && !managerGroupIds.includes(data.groupId)) {
        throw new HttpException('Out of group scope', 405);
      }

      const groupUsers = await this.prisma.user.findMany({
        where: { groups: { some: { id: data.groupId } } },
        select: { id: true },
      });

      // Create a notification for each member of the group
      const notifications = groupUsers.map((u) => ({
        title: data.title,
        body: data.body,
        recipientUserId: u.id,
        groupId: data.groupId,
        createdBy: creatorId,
      }));

      await this.prisma.notification.createMany({ data: notifications });
      return { message: `Created ${notifications.length} notifications for group.` };
    }

    // --- CASE 2: TARGETING A USER ---
    if (data.userId) {
      if (creatorRole === Role.MANAGER) {
        // Manager can only target a user if they share a group
        const targetUser = await this.prisma.user.findUnique({
          where: { id: data.userId },
          select: { groups: { select: { id: true } } },
        });
        const sharesGroup = targetUser?.groups.some((g) => managerGroupIds.includes(g.id));
        if (!sharesGroup) {
          throw new HttpException('Out of group scope', 405);
        }
      }

      return this.prisma.notification.create({
        data: {
          title: data.title,
          body: data.body,
          recipientUserId: data.userId,
          createdBy: creatorId,
        },
      });
    }

    throw new HttpException('Must provide groupId or userId', HttpStatus.BAD_REQUEST);
  }

  async findAll(userId: string, role: Role, query: { page?: number; size?: number; status?: NotificationStatus; groupId?: string; sort?: string }) {
    const page = Number(query.page) || 1;
    const size = Number(query.size) || 20;
    const skip = (page - 1) * size;
    
    // Parse sort (e.g. "createdAt:desc")
    const orderBy: Prisma.NotificationOrderByWithRelationInput = {};
    if (query.sort) {
      const [field, direction] = query.sort.split(':');
	// To this:
if (field && direction) {
  orderBy[field as keyof Prisma.NotificationOrderByWithRelationInput] = direction as Prisma.SortOrder;
}
    } else {
      orderBy.createdAt = 'desc'; // Default sorting
    }

    // Build the dynamic WHERE clause based on Role
    const where: Prisma.NotificationWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.groupId) where.groupId = query.groupId;

    if (role === Role.USER) {
      // Users only see notifications meant for them
      where.recipientUserId = userId;
    } else if (role === Role.MANAGER) {
      // Managers see notifications in their groups OR sent directly to them
      const groupIds = await this.getUserGroupIds(userId);
      where.OR = [
        { groupId: { in: groupIds } },
        { recipientUserId: userId }
      ];
    }
    // ADMIN has no scope restrictions, they see everything matching the query filters

    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({ where, skip, take: size, orderBy }),
      this.prisma.notification.count({ where }),
    ]);

    return { data, meta: { total, page, size } };
  }

  async findOne(id: string, userId: string, role: Role) {
    const notification = await this.prisma.notification.findUnique({ where: { id } });
    if (!notification) throw new NotFoundException('Notification not found');

    if (role === Role.USER && notification.recipientUserId !== userId) {
      throw new ForbiddenException('You can only view your own notifications');
    }

    if (role === Role.MANAGER) {
      const groupIds = await this.getUserGroupIds(userId);
      if (
        notification.recipientUserId !== userId && // Not sent to them
        !(notification.groupId && groupIds.includes(notification.groupId)) // Not in their groups
      ) {
        throw new HttpException('Out of group scope', 405);
      }
    }

    return notification;
  }

  async markAsRead(id: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({ where: { id } });
    if (!notification) throw new NotFoundException('Notification not found');
    
    if (notification.recipientUserId !== userId) {
      throw new ForbiddenException('You can only mark your own notifications as read');
    }

    return this.prisma.notification.update({
      where: { id },
      data: { status: NotificationStatus.READ },
    });
  }

  async updateStatus(id: string, status: NotificationStatus, userId: string, role: Role) {
    // Relying on findOne for the scope checking
    await this.findOne(id, userId, role); 
    
    return this.prisma.notification.update({
      where: { id },
      data: { status },
    });
  }
}
