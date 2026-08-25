
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GroupsService {
  constructor(private prisma: PrismaService) {}

  async findAll(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.group.findMany({ skip, take: limit }),
      this.prisma.group.count(),
    ]);
    return { data, meta: { total, page, limit } };
  }

  async findOne(id: string) {
    const group = await this.prisma.group.findUnique({ where: { id } });
    if (!group) throw new NotFoundException('Group not found');
    return group;
  }

  async create(name: string) {
    return this.prisma.group.create({ data: { name } });
  }

  async addMember(groupId: string, userId: string) {
    return this.prisma.group.update({
      where: { id: groupId },
      data: { users: { connect: { id: userId } } },
    });
  }

  async removeMember(groupId: string, userId: string) {
    return this.prisma.group.update({
      where: { id: groupId },
      data: { users: { disconnect: { id: userId } } },
    });
  }

  async listMembers(groupId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    // We query the User model directly, filtering by those who have this groupId
    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where: { groups: { some: { id: groupId } } },
        skip,
        take: limit,
        select: { id: true, email: true, role: true }, // Don't return passwords
      }),
      this.prisma.user.count({ where: { groups: { some: { id: groupId } } } }),
    ]);
    return { data, meta: { total, page, limit } };
  }
}
