import { describe, expect, it } from 'vitest';
import { editMode, editsMirrorHere, modeHint, modeNotice } from './mirror';
import { sourceMeta } from './sources';

describe('editMode', () => {
  it('is "edit" when the workspace already said this module edits it', () => {
    expect(editMode(true, true)).toBe('edit');
  });

  it('tells "owned by bookings" from "your role cannot edit"', () => {
    expect(editMode(true, false)).toBe('owned-elsewhere');
    expect(editMode(false, false)).toBe('no-permission');
  });
});

describe('modeNotice', () => {
  it('says nothing when the page is editable here', () => {
    expect(modeNotice('services', 'edit')).toBeNull();
    expect(modeNotice('products', 'edit')).toBeNull();
  });

  it('links a mirror to the module that owns it', () => {
    const notice = modeNotice('services', 'owned-elsewhere');
    expect(notice?.href).toBe(sourceMeta('services').ownerHref);
    expect(notice?.linkLabel).toBe('Edit services in Bookings');
    expect(notice?.title).toContain('Bookings');
  });

  it('links Team to the staff editor, not the services one', () => {
    expect(modeNotice('team', 'owned-elsewhere')?.href).toBe('/bookings/staff');
  });

  it('carries a title and a link and no paragraph — the link says the rest', () => {
    const notice = modeNotice('team', 'owned-elsewhere');
    expect(notice?.href).toBe('/bookings/staff');
    expect(notice?.linkLabel).toBe('Edit team in Bookings');
    expect(notice?.body).toBeUndefined();
  });

  it('blames the permission, not the module, when the role is the problem', () => {
    const notice = modeNotice('products', 'no-permission');
    expect(notice?.title).toContain('read');
    expect(notice?.body).toContain('Ai');
    expect(notice?.href).toBeUndefined();
  });

  it('never renders an empty banner for a source with no owner link', () => {
    const notice = modeNotice('products', 'owned-elsewhere');
    expect(notice?.title).toBeTruthy();
    expect(notice?.body).toBeTruthy();
  });
});

describe('modeHint', () => {
  it('is the one-line version, and nothing at all when editable', () => {
    expect(modeHint('services', 'edit')).toBeNull();
    expect(modeHint('services', 'owned-elsewhere')).toBe(modeNotice('services', 'owned-elsewhere')?.title);
  });
});

describe('editsMirrorHere', () => {
  it('is the branch a bookings-less scaffold takes', () => {
    expect(editsMirrorHere('edit')).toBe(true);
    expect(editsMirrorHere('owned-elsewhere')).toBe(false);
    expect(editsMirrorHere('no-permission')).toBe(false);
  });
});
