export class CreateStoryDto {
  title!: string;
  slug!: string;
  content!: string;
  summary?: string | null;
  location?: string | null;
  isTrueStory?: boolean;
  isPublished?: boolean;
}
