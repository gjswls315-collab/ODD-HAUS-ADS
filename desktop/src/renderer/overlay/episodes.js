// Episodes per character pack.

import * as oddhaus from './episodes-oddhaus.js';
import * as chiikawa from './episodes-chiikawa.js';

export { isInSeason } from './seasons.js';

const PACKS = { chiikawa, oddhaus };

export const episodesFor = (pack) => (PACKS[pack] || chiikawa).EPISODES;
export const categoriesFor = (pack) => (PACKS[pack] || chiikawa).CATEGORIES;
