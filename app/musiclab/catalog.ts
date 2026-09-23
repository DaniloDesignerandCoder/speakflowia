export type MusicLicense = "CC0" | "CC-BY";

export type MusicRights = {
  license: MusicLicense;
  commercialUse: true;
  derivativesAllowed: true;
  attributionRequired: boolean;
  sourceName: string;
  sourceUrl: string;
  licenseUrl: string;
  verifiedAt: string;
};

export type MusicPhrase = {
  line: string;
  meaning: string;
  note: string;
};

export type MusicTrack = {
  id: string;
  title: string;
  artist: string;
  level: string;
  focus: string;
  duration: string;
  mood: string;
  description: string;
  phrases: MusicPhrase[];
  audioUrl?: string;
  artworkUrl?: string;
  rights?: MusicRights;
  catalogStatus: "original" | "rights-approved";
};

export function isRightsApproved(track: MusicTrack) {
  if (track.catalogStatus === "original") return true;
  const rights = track.rights;
  return Boolean(
    rights &&
      rights.commercialUse &&
      rights.derivativesAllowed &&
      (rights.license === "CC0" || rights.license === "CC-BY") &&
      rights.sourceUrl &&
      rights.licenseUrl &&
      rights.verifiedAt
  );
}

export function attributionFor(track: MusicTrack) {
  if (!track.rights?.attributionRequired) return null;
  return `${track.title} — ${track.artist} · ${track.rights.license} · ${track.rights.sourceName}`;
}
