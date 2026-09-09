export type PlaylistItem = {
  id: string;
  url: string;
  repetitions: number;
  position: number;
};

export type Playlist = {
  id: string;
  name: string;
  items: PlaylistItem[];
  updatedAt: string;
};

export type DraftItem = {
  id: string;
  url: string;
  repetitions: string;
};

export type PlaylistInputMode = "simple" | "advanced";
