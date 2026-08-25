// apps/backend/src/groups/groups.controller.ts
import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { GroupsService } from './groups.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard) // Requires valid JWT + matching role
@Roles(Role.ADMIN) // Requires ADMIN role for all routes in this controller
@Controller('groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Get()
  findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    // Convert query strings to numbers
    return this.groupsService.findAll(Number(page) || 1, Number(limit) || 10);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.groupsService.findOne(id);
  }

  @Post()
  create(@Body() body: { name: string }) {
    return this.groupsService.create(body.name);
  }

  @Get(':groupId/members')
  listMembers(
    @Param('groupId') groupId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.groupsService.listMembers(groupId, Number(page) || 1, Number(limit) || 10);
  }

  @Post(':groupId/members')
  addMember(@Param('groupId') groupId: string, @Body() body: { userId: string }) {
    return this.groupsService.addMember(groupId, body.userId);
  }

  @Delete(':groupId/members/:userId')
  removeMember(@Param('groupId') groupId: string, @Param('userId') userId: string) {
    return this.groupsService.removeMember(groupId, userId);
  }
}
