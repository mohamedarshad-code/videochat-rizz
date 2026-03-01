/**
 * LiveChat Navigator - Popup Logic
 * Handles detection, randomization, and UI updates.
 */
import { extractTopics } from './topicAnalyzer.js';

document.addEventListener('DOMContentLoaded', async () => {
  const siteDisplay = document.getElementById('site-display');
  const statusBadge = document.getElementById('status-badge');
  const statusText = document.getElementById('current-status-text');
  const refreshBtn = document.getElementById('refresh-btn');
  const newSetBtn = document.getElementById('new-set-btn');
  const loader = document.getElementById('loader');
  const siteSearch = document.getElementById('site-search');
  const emptyView = document.getElementById('empty-view');
  
  // New UI elements
  const alertDismiss = document.querySelector('.alert-btn.dismiss');
  const topAlert = document.querySelector('.top-alert-bar');
  const closeHint = document.querySelector('.close-panel-hint');

  if (alertDismiss) {
    alertDismiss.addEventListener('click', () => {
      topAlert.style.display = 'none';
      chrome.storage.local.set({ alertDismissed: true });
    });
  }

  if (closeHint) {
    closeHint.addEventListener('click', () => {
      window.close(); // Closes the side panel/popup
    });
  }

  // Check if alert was already dismissed
  chrome.storage.local.get(['alertDismissed'], (result) => {
    if (result.alertDismissed && topAlert) {
      topAlert.style.display = 'none';
    }
  });
  
  const rizzContent = document.getElementById('rizz-content');
  const countrySelect = document.getElementById('country-select');
  const getCountryRizzBtn = document.getElementById('get-country-rizz');
  const detectorToggle = document.getElementById('gender-detector-toggle');
  const skipRadios = document.querySelectorAll('input[name="skip-gender"]');
  const tabSites = document.getElementById('tab-sites');
  const tabRizz = document.getElementById('tab-rizz');
  const rizzDisplay = document.getElementById('rizz-display');
  const rizzCategories = document.getElementById('rizz-categories');

  let currentSubset = [];
  let currentRizzCategory = 'All';
  let activeTopic = null; // New state for topic-based filtering
  const DISPLAY_LIMIT = 5;

  /**
   * Fisher-Yates Shuffle Algorithm
   */
  const shuffle = (array) => {
    let currentIndex = array.length,  randomIndex;
    while (currentIndex !== 0) {
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;
      [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
    return array;
  };

  /**
   * Detect current tab and update status
   */
  const detectPlatform = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.url) return null;

      const url = new URL(tab.url);
      const hostname = url.hostname.toLowerCase();
      
      // Match against known domains
      const match = window.SITES_DATA.find(site => {
        return hostname.includes(site.domain) || site.domain.includes(hostname);
      });

      if (match) {
        statusBadge.textContent = 'DETECTED';
        statusBadge.classList.add('active');
        statusText.textContent = `On ${match.name}? Try these alternatives:`;
        return match;
      } else {
        statusBadge.textContent = 'STANDBY';
        statusBadge.classList.remove('active');
        statusText.textContent = 'Explore worldwide video chats:';
        return null;
      }
    } catch (err) {
      console.error('Detection failed:', err);
      return null;
    }
  };

  /**
   * Render a site card
   */
  const renderCard = (site) => {
    const card = document.createElement('div');
    card.className = 'site-card';
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');

    // Create badges HTML
    const badgesHtml = site.tags.slice(0, 2).map(tag => `<span class="badge">${tag}</span>`).join('');

    card.innerHTML = `
      <div class="site-header">
        <span class="site-name">${site.name}</span>
        <div class="site-badges">${badgesHtml}</div>
      </div>
      <p class="site-desc">${site.description}</p>
    `;

    card.addEventListener('click', () => {
      chrome.tabs.create({ url: site.url });
    });

    return card;
  };

  /**
   * Country Based Rizz Implementation
   */
  const handleCountryRizz = async () => {
    const lang = countrySelect.value;
    getCountryRizzBtn.textContent = 'Fetching...';
    getCountryRizzBtn.disabled = true;

    try {
      const lines = await chrome.runtime.sendMessage({ 
        type: "GET_COUNTRY_RIZZ", 
        lang: lang 
      });
      
      if (lines && lines.length > 0) {
        // Clear normal rizz and show localized ones
        rizzContent.innerHTML = '<div class="rizz-category-header">Localized Rizz</div>';
        lines.slice(0, 10).forEach(line => {
          rizzContent.appendChild(renderRizzCard({ text: line, category: 'Local' }));
        });
        // Scroll to content
        rizzContent.scrollIntoView({ behavior: 'smooth' });
      } else {
        alert('No lines found for this region. Try US/Global.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      getCountryRizzBtn.textContent = 'Get Local Rizz';
      getCountryRizzBtn.disabled = false;
    }
  };

  getCountryRizzBtn.addEventListener('click', handleCountryRizz);

  // AI Detection Toggle
  detectorToggle.addEventListener('change', (e) => {
    const active = e.target.checked;
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { 
          type: "TOGGLE_DETECTOR", 
          active: active 
        });
      }
    });
    // Persist setting
    chrome.storage.local.set({ detectorEnabled: active });
  });

  // Skip Logic
  skipRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      const skipValue = e.target.value;
      chrome.storage.local.set({ skipPreference: skipValue });
      
      // Update current tab
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, { 
            type: "UPDATE_SKIP_PREF", 
            pref: skipValue 
          });
        }
      });
    });
  });

  // Restore settings
  chrome.storage.local.get(['detectorEnabled', 'skipPreference'], (result) => {
    if (result.detectorEnabled) {
      detectorToggle.checked = true;
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, { type: "TOGGLE_DETECTOR", active: true });
        }
      });
    }
    if (result.skipPreference) {
      const radio = document.querySelector(`input[name="skip-gender"][value="${result.skipPreference}"]`);
      if (radio) radio.checked = true;
      // Also send to current tab
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, { type: "UPDATE_SKIP_PREF", pref: result.skipPreference });
        }
      });
    }
  });

  /**
   * Render a rizz card
   */
  const renderRizzCard = (rizz) => {
    const card = document.createElement('div');
    card.className = 'rizz-card';
    card.innerHTML = `
      <div class="rizz-text">${rizz.text}</div>
      <div class="rizz-meta">
        <span class="rizz-badge">${rizz.category}</span>
        <span class="rizz-copy-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
            <path d="M13 0H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2zm0 1H6a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1z"/>
            <path d="M4 4H2a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2v-2h-1v2a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h2v-1z"/>
          </svg>
        </span>
      </div>
    `;

    card.addEventListener('click', () => {
      navigator.clipboard.writeText(rizz.text);
      const textEl = card.querySelector('.rizz-text');
      const originalText = textEl.innerHTML;
      textEl.textContent = 'Copied to clipboard!';
      card.style.borderColor = '#3fb950';
      
      setTimeout(() => {
        textEl.innerHTML = originalText;
        card.style.borderColor = 'var(--border)';
      }, 1000);
    });

    return card;
  };

  const renderCategoryPills = () => {
    rizzCategories.innerHTML = '';
    const cats = ['All', ...window.RIZZ_CATEGORIES];
    cats.forEach(cat => {
      const pill = document.createElement('div');
      pill.className = `pill ${currentRizzCategory === cat ? 'active' : ''}`;
      pill.textContent = cat;
      pill.onclick = () => {
        currentRizzCategory = cat;
        renderCategoryPills();
        updateRizzDisplay();
      };
      rizzCategories.appendChild(pill);
    });
  };

  const updateRizzDisplay = (overrideData = null) => {
    rizzContent.innerHTML = '';
    let pool = overrideData || window.RIZZ_DATA;

    if (overrideData) {
      // For search results, show as a simple list
      const shuffled = shuffle([...pool]);
      shuffled.forEach(item => {
        rizzContent.appendChild(renderRizzCard(item));
      });
      return;
    }

    if (currentRizzCategory !== 'All') {
      // Show filtered list for single category
      const filtered = pool.filter(item => item.category === currentRizzCategory);
      const shuffled = shuffle([...filtered]);
      shuffled.slice(0, 10).forEach(item => {
        rizzContent.appendChild(renderRizzCard(item));
      });
    } else {
      // Segregate by Category (Grouped View)
      const categories = [...window.RIZZ_CATEGORIES];
      categories.forEach(cat => {
        const filtered = pool.filter(item => item.category === cat);
        if (filtered.length > 0) {
          const header = document.createElement('div');
          header.className = 'rizz-category-header';
          header.textContent = cat;
          rizzContent.appendChild(header);

          const shuffled = shuffle([...filtered]);
          shuffled.slice(0, 3).forEach(item => {
            rizzContent.appendChild(renderRizzCard(item));
          });
        }
      });
    }
  };

  /**
   * Update the display with a subset of sites
   */
  const updateDisplay = (sites) => {
    siteDisplay.innerHTML = '';
    
    if (sites.length === 0) {
      emptyView.style.display = 'block';
      siteDisplay.style.display = 'none';
    } else {
      emptyView.style.display = 'none';
      siteDisplay.style.display = 'flex';
      
      // Feature 4: weightSitesByTopic - prioritizing if a topic is active
      let displaySites = [...sites];
      if (activeTopic) {
        displaySites = weightSitesByTopic(displaySites, activeTopic);
      }
      
      displaySites.forEach(site => {
        siteDisplay.appendChild(renderCard(site));
      });
    }
  };

  /**
   * Weight sites by active topic (FEATURE 4)
   * High focus on 'dating' and 'games' as requested
   */
  const weightSitesByTopic = (sites, topic) => {
    // Exact mapping for dating/games as requested
    const prioritizeMap = {
      'dating': ['Azar', 'Monkey', 'HOLLA'],
      'games': ['Emerald Chat', 'Chatrandom']
    };

    return sites.sort((a, b) => {
      // Priority 1: Hardcoded requirements
      if (prioritizeMap[topic]) {
        const inA = prioritizeMap[topic].includes(a.name) ? 1 : 0;
        const inB = prioritizeMap[topic].includes(b.name) ? 1 : 0;
        if (inA !== inB) return inB - inA;
      }

      // Priority 2: Tag matching
      const scoreA = a.tags.includes(topic) ? 1 : 0;
      const scoreB = b.tags.includes(topic) ? 1 : 0;
      return scoreB - scoreA;
    });
  };

  /**
   * Feature 3: Trending Topics Handling
   */
  const initTrendingTopics = async () => {
    const topicContainer = document.getElementById('trending-topics');
    // Show spinner if not already there
    if (!topicContainer.querySelector('.topic-spinner')) {
      topicContainer.innerHTML = '<div class="topic-spinner"></div>';
    }
    
    try {
      // 1. Check session cache
      const cached = await chrome.storage.session.get(['chatLogs', 'lastFetch']);
      let logs = cached.chatLogs;

      // 2. Cache validity check (24h)
      const oneDay = 24 * 60 * 60 * 1000;
      const isExpired = !cached.lastFetch || (Date.now() - cached.lastFetch > oneDay);

      if (!logs || isExpired) {
        // Request from background if not cached or expired
        logs = await chrome.runtime.sendMessage({ type: "GET_DATASET" });
      }

      // 3. Extract topics
      const topics = extractTopics(logs);
      
      // 4. Render topics
      topicContainer.innerHTML = '';
      if (topics.length === 0) {
        topicContainer.innerHTML = '<span class="site-desc">No live topics found.</span>';
        return;
      }

      topics.forEach(topic => {
        const pill = document.createElement('div');
        pill.className = `topic-pill ${activeTopic === topic.name ? 'active' : ''}`;
        pill.innerHTML = `
          <span>#${topic.name}</span>
          <span class="topic-count">${topic.count}</span>
        `;
        
        pill.addEventListener('click', () => {
          // Toggle active topic
          activeTopic = activeTopic === topic.name ? null : topic.name;
          
          // Re-render display with weight logic
          updateDisplay(currentSubset);
          
          // Refresh topics UI
          initTrendingTopics();
        });

        topicContainer.appendChild(pill);
      });

    } catch (err) {
      console.error('Trending topics init failed:', err);
      topicContainer.innerHTML = '<span class="site-desc">Topics unavailable.</span>';
    }
  };

  /**
   * Load a fresh set of sites
   */
  const loadNewSet = (excludeSite = null) => {
    loader.style.display = 'flex';
    siteDisplay.style.display = 'none';
    rizzDisplay.style.display = 'none';
    emptyView.style.display = 'none';
    siteSearch.value = ''; // Reset search on new set

    setTimeout(() => {
      let filtered = [...window.SITES_DATA];
      if (excludeSite) {
        filtered = filtered.filter(s => s.name !== excludeSite.name);
      }

      const shuffled = shuffle(filtered);
      currentSubset = shuffled.slice(0, DISPLAY_LIMIT);
      
      updateDisplay(currentSubset);
      renderCategoryPills();
      updateRizzDisplay();

      loader.style.display = 'none';
      
      if (tabSites.classList.contains('active')) {
        siteDisplay.style.display = 'flex';
      } else {
        rizzDisplay.style.display = 'flex';
      }
    }, 400); // Small delay for UX feel
  };

  // Tab Logic
  tabSites.addEventListener('click', () => {
    tabSites.classList.add('active');
    tabRizz.classList.remove('active');
    
    // Explicitly handle display to override any inline styles
    siteDisplay.style.display = 'flex';
    rizzDisplay.style.display = 'none';
    
    siteSearch.placeholder = "Search for video chats...";
    siteSearch.value = '';
    updateDisplay(currentSubset);
  });

  tabRizz.addEventListener('click', () => {
    tabRizz.classList.add('active');
    tabSites.classList.remove('active');
    
    // Explicitly handle display to override any inline styles
    rizzDisplay.style.display = 'flex';
    siteDisplay.style.display = 'none';
    
    siteSearch.placeholder = "Search lines...";
    siteSearch.value = '';
    renderCategoryPills();
    updateRizzDisplay();
  });

  // Search Logic
  siteSearch.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    
    if (query === '') {
      if (tabSites.classList.contains('active')) {
        updateDisplay(currentSubset);
      } else {
        updateRizzDisplay();
      }
      return;
    }

    if (tabSites.classList.contains('active')) {
      const results = window.SITES_DATA.filter(site => 
        site.name.toLowerCase().includes(query) || 
        site.description.toLowerCase().includes(query) ||
        site.tags.some(tag => tag.toLowerCase().includes(query))
      );
      updateDisplay(results);
    } else {
      const results = window.RIZZ_DATA.filter(item => 
        item.text.toLowerCase().includes(query) || 
        item.category.toLowerCase().includes(query)
      );
      updateRizzDisplay(results);
    }
  });

  // Event Listeners
  refreshBtn.addEventListener('click', () => {
    if (siteSearch.value) return; 
    if (tabSites.classList.contains('active')) {
      const reshuffled = shuffle([...currentSubset]);
      updateDisplay(reshuffled);
    } else {
      updateRizzDisplay();
    }
  });

  newSetBtn.addEventListener('click', async () => {
    const currentSite = await detectPlatform();
    loadNewSet(currentSite);
  });

  // Initial Load
  const currentSite = await detectPlatform();
  loadNewSet(currentSite);
  initTrendingTopics(); // Load topics from HF dataset

  // Badge count on icon
  chrome.action.setBadgeText({ text: window.SITES_DATA.length.toString() });
  chrome.action.setBadgeBackgroundColor({ color: '#58a6ff' });
});
