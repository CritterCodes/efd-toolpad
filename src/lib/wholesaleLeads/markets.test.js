import { describe, expect, it } from 'vitest';
import {
  allMarkets, selectMarkets, marketByKey, marketKey, marketForSearchLocation, marketCounts, MARKET_TIERS,
} from './markets';

describe('markets', () => {
  it('loads the Census list', () => {
    const all = allMarkets();
    expect(all.length).toBe(1919);
    // Largest first.
    expect(all[0].city).toBe('New York');
    expect(all[0].population).toBeGreaterThan(8000000);
  });

  it('carries the figures the Census published, not invented ones', () => {
    // Spot-checks against sub-est2024.csv. If the generator or the source changes, these move.
    const fortSmith = marketByKey('fort-smith-arkansas');
    expect(fortSmith).toMatchObject({ city: 'Fort Smith', state: 'Arkansas', population: 90507, tier: 'mid' });
    expect(marketByKey('houston-texas').population).toBe(2390125);
  });

  it('strips the Census government suffix without eating real names', () => {
    // "Fort Smith city" -> "Fort Smith", but "Carson City city" must stay Carson City.
    expect(marketByKey('fort-smith-arkansas').city).toBe('Fort Smith');
    expect(marketByKey('carson-city-nevada')?.city).toBe('Carson City');
    expect(marketByKey('oklahoma-city-oklahoma')?.city).toBe('Oklahoma City');
  });

  it('bands by population, and the bands cover everything', () => {
    const counts = marketCounts();
    expect(counts.reduce((s, c) => s + c.count, 0)).toBe(allMarkets().length);
    expect(counts.find((c) => c.key === 'metro').count).toBe(92);
    expect(counts.find((c) => c.key === 'large').count).toBe(247);
    expect(counts.find((c) => c.key === 'mid').count).toBe(475);
    expect(counts.find((c) => c.key === 'small').count).toBe(1105);
    for (const t of MARKET_TIERS) expect(t.min).toBeGreaterThanOrEqual(20000);
  });

  it('selects by floor, tier, state and limit', () => {
    expect(selectMarkets({ minPopulation: 250000 })).toHaveLength(92);
    expect(selectMarkets({ minPopulation: 50000 })).toHaveLength(814);
    expect(selectMarkets({ tiers: ['metro'] })).toHaveLength(92);
    const ar = selectMarkets({ states: ['Arkansas'] });
    expect(ar.length).toBeGreaterThan(0);
    expect(ar.every((m) => m.state === 'Arkansas')).toBe(true);
    const ten = selectMarkets({ limit: 10 });
    expect(ten).toHaveLength(10);
    expect(ten[0].city).toBe('New York');
  });

  it('skips markets already done', () => {
    const first = selectMarkets({ limit: 1 })[0];
    const next = selectMarkets({ limit: 1, exclude: [first.key] })[0];
    expect(next.key).not.toBe(first.key);
  });

  it('resolves a typed search location to its market', () => {
    expect(marketForSearchLocation('Dallas, Texas').key).toBe('dallas-texas');
    expect(marketForSearchLocation('dallas texas').key).toBe('dallas-texas');
    // A whole state is not a market. Its leads stay ungrouped rather than being filed under a city.
    expect(marketForSearchLocation('Arkansas')).toBeNull();
    expect(marketForSearchLocation('')).toBeNull();
    expect(marketForSearchLocation(null)).toBeNull();
  });

  it('builds a stable, url-safe key', () => {
    expect(marketKey('St. Louis', 'Missouri')).toBe('st-louis-missouri');
    expect(marketKey("Coeur d'Alene", 'Idaho')).toBe('coeur-d-alene-idaho');
  });

  it('every market can be searched and grouped', () => {
    for (const m of allMarkets()) {
      expect(m.key).toMatch(/^[a-z0-9-]+$/);
      expect(m.searchLocation).toContain(m.city);
      expect(m.population).toBeGreaterThanOrEqual(20000);
    }
  });
});
