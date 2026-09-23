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

export const approvedMusicCatalog: MusicTrack[] = [
  {
    id: "the-circle-kira-daly",
    title: "The Circle",
    artist: "Kira Daly / Good Time Villains",
    level: "Intermediate",
    focus: "Listening & Natural English",
    duration: "5:22",
    mood: "Acoustic Pop",
    description: "Faixa vocal real selecionada para uma jornada de listening, ritmo, pronúncia, vocabulário e compreensão.",
    audioUrl: "https://njoisdldoellzuqxkyuk.supabase.co/storage/v1/object/public/musiclab-audio/Kira_Daly_-_The_Circle.mp3",
    phrases: [
      {
        line: "Listen for the pulse before focusing on individual words.",
        meaning: "Escute a pulsação antes de se concentrar em palavras individuais.",
        note: "LISTEN · Atividade SpeakFlow criada para treinar atenção auditiva global, sem reproduzir a letra da música.",
      },
      {
        line: "Notice how the instruments create space around the voice.",
        meaning: "Perceba como os instrumentos criam espaço ao redor da voz.",
        note: "DISCOVER · Identifique camadas, timbres e contrastes antes de interpretar o conteúdo verbal.",
      },
      {
        line: "Keep a steady beat and shadow the rhythm with neutral syllables.",
        meaning: "Mantenha uma batida constante e acompanhe o ritmo com sílabas neutras.",
        note: "SHADOW · Pratique cadência e coordenação oral sem copiar nem presumir palavras da gravação.",
      },
      {
        line: "Describe the mood in one clear English sentence.",
        meaning: "Descreva o clima em uma frase clara em inglês.",
        note: "SPEAK · Produza uma observação autoral usando vocabulário de emoção, intensidade e atmosfera.",
      },
      {
        line: "Return to the music and identify one new sound.",
        meaning: "Volte à música e identifique um novo som.",
        note: "RETURN TO MUSIC · Ouça novamente e compare sua percepção com a primeira passagem.",
      },
    ],
    catalogStatus: "rights-approved",
    rights: {
      license: "CC-BY",
      commercialUse: true,
      derivativesAllowed: true,
      attributionRequired: true,
      sourceName: "Free Music Archive",
      sourceUrl: "https://freemusicarchive.org/index.php/music/kira-daly/single/the-circle-gtv-album-lemonade-lakes/",
      licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
      verifiedAt: "2026-09-23",
    },
  },
  {
    id: "love-and-liberation-anthem",
    title: "Love and Liberation Anthem",
    artist: "Soundwave Sphere",
    level: "Intermediate",
    focus: "Listening, Rhythm & Vocabulary",
    duration: "3:11",
    mood: "Electronic",
    description: "Faixa vocal licenciada para experiências audiovisuais e atividades de compreensão.",
    phrases: [],
    catalogStatus: "rights-approved",
    rights: {
      license: "CC-BY",
      commercialUse: true,
      derivativesAllowed: true,
      attributionRequired: true,
      sourceName: "Free Music Archive",
      sourceUrl: "https://freemusicarchive.org/music/soundwave-sphere/single/love-and-liberation-anthemmp3/",
      licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
      verifiedAt: "2026-09-23",
    },
  },
].filter(isRightsApproved);
