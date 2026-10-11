import { IsString } from 'class-validator';

export class RefreshDto {
    @IsString({ message: 'refresh token مطلوب' })
    refresh_token: string;
}