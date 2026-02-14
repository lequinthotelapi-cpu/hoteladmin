export interface Country {
  name: string;
  iso2: string;
  iso3: string;
  unicodeFlag: string;
}

export interface CountriesApiResponse {
  error: boolean;
  msg: string;
  data: Country[];
}
