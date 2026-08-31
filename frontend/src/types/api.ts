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

/** A user's saved custom tuning. `strings` are note+octave tokens (e.g. "E2"), low → high. */
export interface CustomTuning {
  id: number;
  name: string;
  strings: string[];
  createdAt: string | null;
}
