// What each battlefield is like to fight on, for the lobby's choices.

export const MAP_BLURBS: Record<string, string> = {
  plains: 'Open farmland with a low hill, woods and a stream: room for cavalry to sweep round the flanks.',
  hills: 'Rolling hills: the side holding the high ground fights better, and climbing slows an attack. Woods on the slopes hide troops.',
  woods: 'A great forest that slows horses and breaks up formations. Armies meet in clearings and along the forest road.',
  desert: 'Open sand that tires and slows everyone a little, with rocky outcrops and an oasis to fight over.',
  river: 'A river splits the field: it can only be crossed at the bridge and the fords, and crossing under attack is deadly.',
  hillfort: 'A hill crowned by a camp: the defenders hold the top and can be attacked from every side.',
  pass: 'The narrow pass of Thermopylae between the cliffs and the sea, where numbers count for little.',
};

/** A choice's name with the battlefield's blurb. */
export const mapChoice = (id: string, name: string): { id: string; name: string; desc: string } => ({ id, name, desc: MAP_BLURBS[id] ?? '' });
