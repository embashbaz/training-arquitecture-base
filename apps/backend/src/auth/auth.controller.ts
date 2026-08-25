// apps/backend/src/auth/auth.controller.ts
import { Controller, Post, Body, Get, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

// We leave the prefix empty so we can do exactly '/auth/login' and '/me' 
// as requested in the task instructions
@Controller() 
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('auth/login')
  async login(@Body() body: Record<string, string>) {
    return this.authService.login(body.email, body.password);
  }

  @UseGuards(JwtAuthGuard) // This requires a valid Bearer token!
  @Get('me')
  getProfile(@Request() req: any) {
    // req.user is populated by our JwtStrategy
    return req.user; 
  }
}
