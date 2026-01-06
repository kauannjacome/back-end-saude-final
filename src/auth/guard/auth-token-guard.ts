import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Request } from "express";

@Injectable()
export class AuthTokenGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request: Request = context.switchToHttp().getRequest();
    const token = this.extractTokenHeader(request);

    if (!token) {
      return false;
    }

    // Aqui você pode validar o token (JWT, etc.)
    return true;
  }

  private extractTokenHeader(request: Request): string | undefined {
    const authorization = request.headers["authorization"];

    if (!authorization || typeof authorization !== "string") {
      return;
    }

    return authorization;
  }
}
