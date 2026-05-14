import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPropertySpecsAndApproval1778730529413 implements MigrationInterface {
    name = 'AddPropertySpecsAndApproval1778730529413'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "properties" ADD "bedrooms" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "properties" ADD "bathrooms" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "properties" ADD "floors" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "properties" ADD "frontage" double precision`);
        await queryRunner.query(`ALTER TABLE "properties" ADD "direction" character varying`);
        await queryRunner.query(`ALTER TABLE "properties" ADD "legal_status" character varying`);
        await queryRunner.query(`ALTER TABLE "properties" ADD "isApproved" boolean NOT NULL DEFAULT false`);
        // Approve existing properties
        await queryRunner.query(`UPDATE "properties" SET "isApproved" = true`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "properties" DROP COLUMN "isApproved"`);
        await queryRunner.query(`ALTER TABLE "properties" DROP COLUMN "legal_status"`);
        await queryRunner.query(`ALTER TABLE "properties" DROP COLUMN "direction"`);
        await queryRunner.query(`ALTER TABLE "properties" DROP COLUMN "frontage"`);
        await queryRunner.query(`ALTER TABLE "properties" DROP COLUMN "floors"`);
        await queryRunner.query(`ALTER TABLE "properties" DROP COLUMN "bathrooms"`);
        await queryRunner.query(`ALTER TABLE "properties" DROP COLUMN "bedrooms"`);
    }

}
