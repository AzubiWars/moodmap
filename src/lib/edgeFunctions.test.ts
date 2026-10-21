import { edgeFunctionHeaders } from './edgeFunctions';

describe('edgeFunctionHeaders', () => {
  it('never sends a publishable key as Bearer', () => {
    expect(edgeFunctionHeaders('sb_publishable_public')).toEqual({
      'Content-Type': 'application/json',
      apikey: 'sb_publishable_public',
    });
  });

  it('keeps a legacy anon JWT as Bearer', () => {
    const key = 'header.payload.signature';
    expect(edgeFunctionHeaders(key)).toEqual({
      'Content-Type': 'application/json',
      apikey: key,
      Authorization: `Bearer ${key}`,
    });
  });
});
