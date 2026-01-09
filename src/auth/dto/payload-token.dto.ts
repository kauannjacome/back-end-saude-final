export class PayloadTokenDto {
  user_id: number;
  sub_id: number;
  role: string;
  iat: number;
  exp: number;
  aud: string;
  iss: string;
}
