
import { Controller, Get, Post, Body, Patch, Param, Query, UseGuards, Request } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role, NotificationStatus } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard) // Base protection for the whole controller
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Roles(Role.ADMIN, Role.MANAGER) // Users explicitly banned from this route via metadata
  @Post()
  create(@Request() req: any, @Body() body: { title: string; body: string; groupId?: string; userId?: string }) {
    return this.notificationsService.create(req.user.id, req.user.role, body);
  }

  @Get() // Accessible by any logged-in user, scoping happens in the service
  findAll(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('size') size?: string,
    @Query('status') status?: NotificationStatus,
    @Query('groupId') groupId?: string,
    @Query('sort') sort?: string,
  ) {
    return this.notificationsService.findAll(req.user.id, req.user.role, {
      page: Number(page),
      size: Number(size),
      status,
      groupId,
      sort,
    });
  }

  @Get(':id') // Accessible by any logged-in user
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.notificationsService.findOne(id, req.user.id, req.user.role);
  }

  @Patch(':id/read') // Accessible by any logged-in user
  markAsRead(@Request() req: any, @Param('id') id: string) {
    return this.notificationsService.markAsRead(id, req.user.id);
  }

  @Roles(Role.ADMIN, Role.MANAGER) // Only Admins and Managers can manually update statuses
  @Patch(':id/status')
  updateStatus(@Request() req: any, @Param('id') id: string, @Body() body: { status: NotificationStatus }) {
    return this.notificationsService.updateStatus(id, body.status, req.user.id, req.user.role);
  }
}
