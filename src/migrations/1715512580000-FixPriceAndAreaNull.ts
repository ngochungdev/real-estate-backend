import { MigrationInterface, QueryRunner } from "typeorm";

export class FixPriceAndAreaNull1715512580000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Cập nhật các giá trị NULL về 0 trước khi thay đổi kiểu dữ liệu (nếu có)
        await queryRunner.query(`UPDATE "properties" SET "price" = 0 WHERE "price" IS NULL`);
        await queryRunner.query(`UPDATE "properties" SET "area" = 0 WHERE "area" IS NULL`);

        // 2. Thay đổi kiểu dữ liệu sang double precision
        // Sử dụng USING để ép kiểu dữ liệu cũ sang số thực
        await queryRunner.query(`ALTER TABLE "properties" ALTER COLUMN "price" TYPE double precision USING "price"::double precision`);
        await queryRunner.query(`ALTER TABLE "properties" ALTER COLUMN "area" TYPE double precision USING "area"::double precision`);

        // 3. Đặt ràng buộc NOT NULL
        await queryRunner.query(`ALTER TABLE "properties" ALTER COLUMN "price" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "properties" ALTER COLUMN "area" SET NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Hoàn tác: Chuyển về kiểu integer (nếu cần)
        await queryRunner.query(`ALTER TABLE "properties" ALTER COLUMN "price" TYPE integer USING "price"::integer`);
        await queryRunner.query(`ALTER TABLE "properties" ALTER COLUMN "area" TYPE integer USING "area"::integer`);
    }
}
