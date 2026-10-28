import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateStoryDto } from './dto/create-story.dto.js';
import { UpdateStoryDto } from './dto/update-story.dto.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { Prisma } from '../../generated/prisma/client.js';

@Injectable()
export class StoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createStoryDto: CreateStoryDto) {
    if (
      typeof createStoryDto.title !== 'string' ||
      !createStoryDto.title.trim() ||
      typeof createStoryDto.slug !== 'string' ||
      !createStoryDto.slug.trim() ||
      typeof createStoryDto.content !== 'string' ||
      !createStoryDto.content.trim()
    ) {
      throw new BadRequestException('title, slug, and content are required');
    }
    this.validateOptionalFields(createStoryDto);

    try {
      return await this.prisma.story.create({
        data: {
          title: createStoryDto.title.trim(),
          slug: createStoryDto.slug.trim(),
          content: createStoryDto.content,
          summary: createStoryDto.summary,
          location: createStoryDto.location,
          isTrueStory: createStoryDto.isTrueStory,
          isPublished: createStoryDto.isPublished,
        },
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async findAll() {
    return await this.prisma.story.findMany();
  }

  async findOne(id: number) {
    const story = await this.prisma.story.findUnique({ where: { id } });
    if (!story) throw new NotFoundException(`Story ${id} not found`);
    return story;
  }

  async update(id: number, updateStoryDto: UpdateStoryDto) {
    const fields = [
      'title',
      'slug',
      'content',
      'summary',
      'location',
      'isTrueStory',
      'isPublished',
    ] as const;
    const data = Object.fromEntries(
      fields
        .map((field) => [field, updateStoryDto[field]] as const)
        .filter(([, value]) => value !== undefined),
    ) as Prisma.StoryUpdateInput;
    if (Object.keys(data).length === 0) {
      throw new BadRequestException('Provide at least one field to update');
    }
    for (const field of ['title', 'slug', 'content'] as const) {
      const value = data[field];
      if (value !== undefined && (typeof value !== 'string' || !value.trim())) {
        throw new BadRequestException(`${field} must be a non-empty string`);
      }
    }
    this.validateOptionalFields(updateStoryDto);

    try {
      return await this.prisma.story.update({ where: { id }, data });
    } catch (error) {
      this.handlePrismaError(error, id);
    }
  }

  async remove(id: number) {
    try {
      return await this.prisma.story.delete({ where: { id } });
    } catch (error) {
      this.handlePrismaError(error, id);
    }
  }

  private handlePrismaError(error: unknown, id?: number): never {
    if (typeof error === 'object' && error !== null && 'code' in error) {
      const code = error.code;
      if (code === 'P2002') {
        throw new ConflictException('A story with this slug already exists');
      }
      if (code === 'P2025') {
        throw new NotFoundException(`Story ${id ?? ''} not found`);
      }
    }
    throw error;
  }

  private validateOptionalFields(dto: CreateStoryDto | UpdateStoryDto) {
    for (const field of ['summary', 'location'] as const) {
      const value = dto[field];
      if (value !== undefined && value !== null && typeof value !== 'string') {
        throw new BadRequestException(`${field} must be a string or null`);
      }
    }
    for (const field of ['isTrueStory', 'isPublished'] as const) {
      const value = dto[field];
      if (value !== undefined && typeof value !== 'boolean') {
        throw new BadRequestException(`${field} must be a boolean`);
      }
    }
  }
}
