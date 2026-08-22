import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/approval-workflow/client';

/**
 * approval-workflow 子客户端服务（三库三 client 体系，对应 schema 路径
 * `prisma/approval-workflow/schema.prisma`，见 API-ALIGNMENT.md §6.2）。
 *
 * 在你的后端项目里，确保已执行 `prisma generate --schema prisma/approval-workflow/schema.prisma`，
 * 使 `@prisma/approval-workflow/client` 可用。若你的 client 导出名不同，按实际调整。
 */
@Injectable()
export class PrismaService extends PrismaClient {}
