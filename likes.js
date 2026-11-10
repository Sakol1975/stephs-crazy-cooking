(() => {
  'use strict';

  // Public Supabase settings. The publishable key is designed for browser use;
  // table access is restricted by the Row Level Security policies.
  const SUPABASE_URL = 'https://rjlqioykfqeofqidqbwk.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_L1mKqOv2Mx63dv--Qp6lxg_l1fTOTZt';
  const TABLE_URL = `${SUPABASE_URL}/rest/v1/likes`;

  const button = document.querySelector('[data-like-button]');
  if (!button) return;

  const type = button.dataset.contentType;
  const contentId = button.dataset.contentId;
  const countElement = button.querySelector('[data-like-count]');
  const labelElement = button.querySelector('[data-like-label]');
  const validTypes = ['recept', 'blog'];

  if (!validTypes.includes(type) || !contentId || !countElement) {
    console.error('Like-knop mist een geldig type, ID of teller.');
    button.hidden = true;
    return;
  }

  const storageKey = `steph-likes:${type}:${contentId}`;
  const visitorStorageKey = 'steph-crazy-cooking-voter-id';

  function getVisitorId() {
    try {
      let visitorId = localStorage.getItem(visitorStorageKey);
      if (!visitorId) {
        visitorId = (crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`);
        localStorage.setItem(visitorStorageKey, visitorId);
      }
      return visitorId;
    } catch (error) {
      // Storage can be unavailable in private/restricted browser modes.
      return `session-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }
  }

  const visitorId = getVisitorId();
  const headers = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`
  };

  function setCount(count) {
    countElement.textContent = String(count);
    const noun = count === 1 ? 'like' : 'likes';
    if (labelElement) labelElement.textContent = noun;
    button.setAttribute('aria-label', `${count} ${noun}`);
  }

  function setLiked(liked) {
    button.classList.toggle('is-liked', liked);
    button.setAttribute('aria-pressed', String(liked));
    button.disabled = liked;
    const heart = button.querySelector('[data-like-heart]');
    if (heart) heart.textContent = liked ? '♥' : '♡';
    if (liked) button.title = 'Je hebt dit al geliket';
    else button.removeAttribute('title');
  }

  async function loadLikes() {
    const params = new URLSearchParams({
      select: 'id',
      content_type: `eq.${type}`,
      content_id: `eq.${contentId}`
    });
    const response = await fetch(`${TABLE_URL}?${params.toString()}`, {
      method: 'GET',
      headers
    });
    if (!response.ok) throw new Error(`Likes ophalen mislukt (${response.status})`);
    const rows = await response.json();
    setCount(rows.length);
  }

  async function addLike() {
    if (localStorage.getItem(storageKey) === 'liked') {
      setLiked(true);
      return;
    }

    button.disabled = true;
    button.classList.add('is-loading');
    try {
      const response = await fetch(TABLE_URL, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal'
        },
        body: JSON.stringify({
          content_type: type,
          content_id: contentId,
          voter_id: visitorId
        })
      });

      if (response.status === 409) {
        localStorage.setItem(storageKey, 'liked');
        setLiked(true);
        return;
      }
      if (!response.ok) {
        const details = await response.text();
        throw new Error(`Like opslaan mislukt (${response.status}): ${details}`);
      }

      localStorage.setItem(storageKey, 'liked');
      setLiked(true);
      const currentCount = Number(countElement.textContent) || 0;
      setCount(currentCount + 1);
    } catch (error) {
      console.error(error);
      button.disabled = false;
      button.title = 'Opslaan lukte niet. Probeer opnieuw.';
    } finally {
      button.classList.remove('is-loading');
    }
  }

  button.addEventListener('click', addLike);

  try {
    setLiked(localStorage.getItem(storageKey) === 'liked');
  } catch (_) {
    setLiked(false);
  }

  loadLikes().catch((error) => {
    console.error(error);
    countElement.textContent = '–';
    button.title = 'Likes konden niet worden geladen';
  });
})();
