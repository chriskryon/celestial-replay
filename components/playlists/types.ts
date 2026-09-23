export type PlaylistItem = {
  id: string;
  url: string;
  title: string | null;
  repetitions: number;
  position: number;
};

export type Playlist = {
  id: string;
  name: string;
  items: PlaylistItem[];
  isPublic: boolean;
  isFavorite: boolean;
  updatedAt: string;
};

export type DraftItem = {
  id: string;
  url: string;
  title: string;
  repetitions: string;
};

export type PlaylistInputMode = "simple" | "advanced";
