import { describe, it, expect, beforeEach } from 'vitest';
import { PlayerRegistryService } from '../adapters/service';
import { InMemoryPlayerStorage } from '../adapters/in-memory-storage';

describe('Player Registry', () => {
  let service: PlayerRegistryService;

  beforeEach(() => {
    service = new PlayerRegistryService(new InMemoryPlayerStorage());
  });

  it('registers a player and returns success with ID and name', async () => {
    const result = await service.registerPlayer('Alice', 10);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.name).toBe('Alice');
      expect(result.value.shoeSize).toBe(10);
      expect(result.value.id).toMatch(/^p-/);
    }
  });

  it('gets a player by ID', async () => {
    const reg = await service.registerPlayer('Bob', 9);
    if (!reg.success) throw new Error('Registration failed');

    const result = await service.getPlayer(reg.value.id);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.name).toBe('Bob');
      expect(result.value.id).toBe(reg.value.id);
    }
  });

  it('lists all registered players', async () => {
    await service.registerPlayer('Alice', 10);
    await service.registerPlayer('Bob', 9);

    const result = await service.listPlayers();
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.length).toBe(2);
      const names = result.value.map(p => p.name).sort();
      expect(names).toEqual(['Alice', 'Bob']);
    }
  });

  it('returns failure for non-existent player', async () => {
    const result = await service.getPlayer('p-nonexistent');
    expect(result.success).toBe(false);
  });
});
