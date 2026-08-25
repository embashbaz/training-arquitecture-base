// apps/backend/src/users/users.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findAll() {
    return this.prisma.user.findMany({
      select: { id: true, email: true, role: true, groups: { select: { id: true, name: true } } },
    });
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, role: true, groups: { select: { id: true, name: true } } },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async create(data: { email: string; password?: string; role?: Role; groupIds?: string[] }) {
    const passwordHash = await bcrypt.hash(data.password || 'DefaultPass123!', 10);
    
    return this.prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        role: data.role || 'USER',
        groups: data.groupIds ? { connect: data.groupIds.map(id => ({ id })) } : undefined,
      },
      select: { id: true, email: true, role: true }, // Don't return passwordHash
    });
  }

  async update(id: string, data: { email?: string; role?: Role; groupIds?: string[] }) {
    return this.prisma.user.update({
      where: { id },
      data: {
        email: data.email,
        role: data.role,
        groups: data.groupIds ? { set: data.groupIds.map(groupId => ({ id: groupId })) } : undefined,
      },
      select: { id: true, email: true, role: true },
    });
  }

  async remove(id: string) {
    return this.prisma.user.delete({
      where: { id },
      select: { id: true, email: true },
    });
  }
}
