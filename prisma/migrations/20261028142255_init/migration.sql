-- CreateTable
CREATE TABLE `ghost_stories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(200) NOT NULL,
    `slug` VARCHAR(220) NOT NULL,
    `summary` VARCHAR(500) NULL,
    `content` TEXT NOT NULL,
    `location` VARCHAR(200) NULL,
    `isTrueStory` BOOLEAN NOT NULL DEFAULT false,
    `isPublished` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ghost_stories_slug_key`(`slug`),
    INDEX `ghost_stories_title_idx`(`title`),
    INDEX `ghost_stories_isPublished_createdAt_idx`(`isPublished`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
