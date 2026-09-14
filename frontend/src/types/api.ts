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

export interface TuningRequestDto {
  name: string;
  strings: string[];
}

/** A single freeform-marked fret/string pair — mirrors `FreeformMark` in `fretboardStore`. */
export interface FreeformMarkDto {
  fret: number;
  string: number;
}

/** Fretboard state saved/restored for premium session persistence (Story 4.4). */
export interface SessionStateDto {
  tuning: string;
  capoPosition: number;
  freeformMarks: FreeformMarkDto[];
}

export interface SessionResponseDto {
  id: number;
  state: SessionStateDto;
  updatedAt: string | null;
}
