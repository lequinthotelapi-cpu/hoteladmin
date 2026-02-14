import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { Country, CountriesApiResponse } from '../../domain/models/country.model';

@Injectable({
  providedIn: 'root'
})
export class CountriesService {
  private apiUrl = 'https://countriesnow.space/api/v0.1/countries/flag/unicode';
  private countriesCache$ = new BehaviorSubject<Country[]>([]);
  private loaded = false;

  constructor(private http: HttpClient) {}

  loadCountries(): Observable<Country[]> {
    if (this.loaded) {
      return this.countriesCache$.asObservable();
    }

    return this.http.get<CountriesApiResponse>(this.apiUrl).pipe(
      map(response => response.data.sort((a, b) => a.name.localeCompare(b.name))),
      tap(countries => {
        this.countriesCache$.next(countries);
        this.loaded = true;
      }),
      catchError(error => {
        console.error('Error loading countries:', error);
        return of([]);
      })
    );
  }

  getCountries(): Observable<Country[]> {
    if (this.loaded) {
      return this.countriesCache$.asObservable();
    }
    return this.loadCountries();
  }

  searchCountries(searchTerm: string): Observable<Country[]> {
    return this.getCountries().pipe(
      map(countries => {
        if (!searchTerm || searchTerm.trim() === '') {
          return countries;
        }
        const term = searchTerm.toLowerCase();
        return countries.filter(country => 
          country.name.toLowerCase().includes(term) ||
          country.iso2.toLowerCase().includes(term) ||
          country.iso3.toLowerCase().includes(term)
        );
      })
    );
  }
}
