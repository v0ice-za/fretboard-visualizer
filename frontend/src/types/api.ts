export interface UserResponseDto {
  id: number;
  email: string;
  name: string | null;
}

export interface AuthResponseDto {
  accessToken: string;
  user: UserResponseDto;
}

export interface CheckoutSessionResponseDto {
  url: string;
}
