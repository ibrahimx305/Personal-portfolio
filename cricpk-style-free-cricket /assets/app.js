
      /* Already inside the app? The Live Cricket APK is an Android WebView
         (its user agent carries the "; wv)" marker) and the browser install
         opens in standalone display mode. Either way the visitor already has
         the app, so flag it before first paint: the CSS below then never
         shows them the Download APK / Install options again. */
      (function () {
        var ua = window.navigator.userAgent || '';
        var standalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
        if (standalone || /;\s*wv\)/.test(ua)) document.documentElement.classList.add('in-app');
      })();
    

      (function () {
        var search = document.getElementById('search');
        var cards = Array.prototype.slice.call(document.querySelectorAll('#channelGrid .card'));
        var countryCards = Array.prototype.slice.call(document.querySelectorAll('#countryGrid .card'));
        var matchCards = Array.prototype.slice.call(document.querySelectorAll('#matchRail .mcard'));
        var fixtures = Array.prototype.slice.call(document.querySelectorAll('#fixtureList .fixture'));
        var noResults = document.getElementById('noResults');
        var countryNoResults = document.getElementById('countryNoResults');
        var chips = Array.prototype.slice.call(document.querySelectorAll('.fchip'));
        var activeFilter = 'all';

        /* App-style order: the top player is already first in the page;
           the channel wall comes straight after the match-centre hero,
           then matches, then countries, and the Get-the-App card moves
           down just before the schedule. Moving the nodes keeps every
           listener and the search/filter wiring exactly as it was. */
        (function reorderAppSections() {
          var mainEl = document.querySelector('main.wrap');
          var secChannels = document.getElementById('channels');
          var secMatches = document.getElementById('matches');
          var secApp = document.getElementById('app');
          var secSchedule = document.getElementById('schedule');
          if (mainEl && secChannels && secMatches) mainEl.insertBefore(secChannels, secMatches);
          if (mainEl && secApp && secSchedule) mainEl.insertBefore(secApp, secSchedule);
        })();

        function applyFilters() {
          var q = (search.value || '').trim().toLowerCase();
          var visible = 0;
          cards.forEach(function (card) {
            var cats = card.getAttribute('data-cat') || '';
            var name = (card.getAttribute('data-name') || '') + ' ' + card.textContent.toLowerCase();
            var catOk = activeFilter === 'all' || cats.split(' ').indexOf(activeFilter) !== -1;
            var qOk = !q || name.indexOf(q) !== -1;
            var show = catOk && qOk;
            card.style.display = show ? '' : 'none';
            if (show) visible++;
          });
          noResults.style.display = visible === 0 ? 'block' : 'none';
          var countryVisible = 0;
          countryCards.forEach(function (card) {
            var name = (card.getAttribute('data-name') || '') + ' ' + card.textContent.toLowerCase();
            var show = !q || name.indexOf(q) !== -1;
            card.style.display = show ? '' : 'none';
            if (show) countryVisible++;
          });
          countryNoResults.style.display = countryVisible === 0 ? 'block' : 'none';
          matchCards.forEach(function (card) {
            var name = (card.getAttribute('data-name') || '') + ' ' + card.textContent.toLowerCase();
            card.style.display = (!q || name.indexOf(q) !== -1) ? '' : 'none';
          });
          refreshRail();
          fixtures.forEach(function (fx) {
            var name = (fx.getAttribute('data-name') || '') + ' ' + fx.textContent.toLowerCase();
            fx.style.display = (!q || name.indexOf(q) !== -1) ? '' : 'none';
          });
        }

        search.addEventListener('input', applyFilters);
        chips.forEach(function (chip) {
          chip.addEventListener('click', function () {
            activeFilter = chip.getAttribute('data-filter');
            chips.forEach(function (c) { c.setAttribute('aria-pressed', c === chip ? 'true' : 'false'); });
            applyFilters();
          });
        });

        /* Swipe rails: the match cards and the country cards both scroll
           left-right like the match strip in score apps — finger swipe,
           arrow buttons and position dots. One controller drives each rail;
           refreshRail() is called from applyFilters() so search keeps working. */
        var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        function createRail(railEl, dotsBox, prevBtn, nextBtn, allCards) {
          if (!railEl || !dotsBox) return { refresh: function () {}, update: function () {} };
          function visible() {
            return allCards.filter(function (c) { return c.style.display !== 'none'; });
          }
          function pos(card) {
            return card.getBoundingClientRect().left - railEl.getBoundingClientRect().left + railEl.scrollLeft;
          }
          function update() {
            var vis = visible();
            if (!vis.length) return;
            var idx = 0, best = Infinity;
            vis.forEach(function (card, i) {
              var dist = Math.abs(pos(card) - railEl.scrollLeft);
              if (dist < best) { best = dist; idx = i; }
            });
            Array.prototype.forEach.call(dotsBox.children, function (d, i) {
              d.classList.toggle('active', i === idx);
            });
            if (prevBtn) prevBtn.disabled = railEl.scrollLeft <= 4;
            if (nextBtn) nextBtn.disabled = railEl.scrollLeft >= railEl.scrollWidth - railEl.clientWidth - 4;
          }
          function refresh() {
            dotsBox.innerHTML = '';
            visible().forEach(function (card) {
              var h = card.querySelector('h3, .mc-series');
              var d = document.createElement('button');
              d.type = 'button';
              d.className = 'rail-dot';
              d.setAttribute('aria-label', 'Go to ' + (h ? h.textContent : 'card'));
              d.addEventListener('click', function () {
                railEl.scrollTo({ left: pos(card), behavior: reduceMotion ? 'auto' : 'smooth' });
              });
              dotsBox.appendChild(d);
            });
            railEl.scrollLeft = 0;
            update();
          }
          function step(dir) {
            var vis = visible();
            if (!vis.length) return;
            railEl.scrollBy({ left: dir * (vis[0].offsetWidth + 14), behavior: reduceMotion ? 'auto' : 'smooth' });
          }
          var ticking = false;
          railEl.addEventListener('scroll', function () {
            if (!ticking) {
              ticking = true;
              window.requestAnimationFrame(function () { update(); ticking = false; });
            }
          }, { passive: true });
          if (prevBtn) prevBtn.addEventListener('click', function () { step(-1); });
          if (nextBtn) nextBtn.addEventListener('click', function () { step(1); });
          window.addEventListener('resize', update);
          refresh();
          return { refresh: refresh, update: update };
        }
        var countryRail = createRail(
          document.getElementById('countryGrid'),
          document.getElementById('countryDots'),
          document.getElementById('countryPrev'),
          document.getElementById('countryNext'),
          countryCards
        );
        var matchRail = createRail(
          document.getElementById('matchRail'),
          document.getElementById('matchDots'),
          document.getElementById('matchPrev'),
          document.getElementById('matchNext'),
          matchCards
        );
        function refreshRail() {
          countryRail.refresh();
          matchRail.refresh();
        }

        /* Countdown to the next match: Tue 27 Oct 2026, 1:00 PM PKT (UTC+5), then the final. */
        var targets = [
          { at: Date.UTC(2026, 9, 27, 8, 0, 0), label: 'Next match — Pakistan vs Sri Lanka, Tue 27 Oct, 1:00 PM PKT — starts in' },
          { at: Date.UTC(2026, 9, 29, 8, 0, 0), label: 'Next match — Sri Lanka vs England, Thu 29 Oct, 1:00 PM PKT — starts in' },
          { at: Date.UTC(2026, 9, 31, 8, 0, 0), label: 'The Final — Sat 31 Oct, 1:00 PM PKT, Lahore — starts in' }
        ];
        var cdTime = document.getElementById('cdTime');
        var cdLabel = document.querySelector('#countdownBox .cd-label');
        function pad(n) { return (n < 10 ? '0' : '') + n; }
        function tick() {
          var now = Date.now();
          var t = null;
          for (var i = 0; i < targets.length; i++) { if (targets[i].at > now) { t = targets[i]; break; } }
          if (!t) {
            cdLabel.textContent = 'The tri-series final has been played — highlights are on the PCB YouTube channel above.';
            cdTime.textContent = '';
            return;
          }
          cdLabel.textContent = t.label;
          var s = Math.floor((t.at - now) / 1000);
          var d = Math.floor(s / 86400); s -= d * 86400;
          var h = Math.floor(s / 3600); s -= h * 3600;
          var m = Math.floor(s / 60); s -= m * 60;
          cdTime.textContent = (d > 0 ? d + 'd ' : '') + pad(h) + ':' + pad(m) + ':' + pad(s);
        }
        tick();
        setInterval(tick, 1000);

        /* Match detail — tapping a card in the world strip opens the match
           the way the score apps show it: a full-screen view with Info, Live,
           Scorecard, Squads, Overs and Highlights tabs. Everything shown
           comes from this page's own match facts; a tab with no local data
           links out to the free coverage rather than inventing numbers. */
        var PAK_SQUAD = ['Shaheen Shah Afridi (c)', 'Abrar Ahmed', 'Salman Ali Agha', 'Arafat Minhas', 'Babar Azam', 'Faheem Ashraf', 'Fakhar Zaman', 'Muhammad Ghazi Ghori (wk)', 'Haris Rauf', 'Hasan Nawaz', 'Naseem Shah', 'Razaullah', 'Saad Baig (wk)', 'Saim Ayub', 'Shadab Khan', 'Sufiyan Moqim'];
        var ENG_SQUAD = ['Harry Brook (c)', 'Gus Atkinson', 'Sonny Baker', 'Tom Banton', 'James Coles', 'Jordan Cox', 'Mason Crane', 'Henry Crocombe', 'Sam Curran', 'Liam Dawson', 'Ben Duckett', 'Will Jacks', 'Jamie Overton', 'Adil Rashid', 'Joe Root', 'Josh Tongue'];
        var PAK_XI_M4 = ['Fakhar Zaman', 'Saim Ayub', 'Babar Azam', 'Saad Baig (wk)', 'Salman Ali Agha', 'Hasan Nawaz', 'Shadab Khan', 'Arafat Minhas', 'Shaheen Afridi (c)', 'Razaullah — ODI debut', 'Haris Rauf'];
        var SL_NOTE = 'Sri Lanka are captained by Kusal Mendis for this series.';
        var MD = {
          indw2: {
            date: 'Sun 25 Oct 2026', time: '1:30 PM PKT', toss: 'India Women opt to bat',
            venue: 'BCA Stadium, Kotambi, Vadodara', city: 'Vadodara',
            potm: { name: 'Harmanpreet Kaur', line: '126 (121)' },
            summary: 'Harmanpreet Kaur\u2019s 126 and Deepti Sharma\u2019s unbeaten 106* lifted India Women to 328/6. Zimbabwe Women reached 107/2 chasing 329, but were bowled out for 207 in 48.5 overs \u2014 India Women won by 121 runs and took the series 2\u20130.',
            notes: { INDW: 'Harmanpreet Kaur 126 \u00b7 Deepti Sharma 106*', ZIMW: 'Were 107/2 (22.2) chasing 329' },
            pair: {
              A: [['Pratika Rawal', 'Batter'], ['Smriti Mandhana (c)', 'Batter'], ['Shafali Verma', 'Batter'], ['Harmanpreet Kaur', 'Batting Allrounder'], ['Tejal Hasabnis', 'Batting Allrounder'], ['Deepti Sharma', 'Batting Allrounder'], ['Richa Ghosh (wk)', 'WK-Batter'], ['Vaishnavi Sharma', 'Bowling Allrounder'], ['Sayali Satghare', 'Bowling Allrounder'], ['Shree Charani', 'Bowler'], ['Jintimani Kalita', 'Bowling Allrounder']],
              B: [['Modester Mupachikwa (wk)', 'WK-Batter'], ['Loryn Phiri', 'Bowling Allrounder'], ['Chipo Mugeri-Tiripano', 'Batting Allrounder'], ['Beloved Biza', 'Bowling Allrounder'], ['Josephine Nkomo (c)', 'Bowling Allrounder'], ['Nyasha Gwanzura', 'Batter'], ['Chiedza Dhururu', 'WK-Batter'], ['Michelle Mavunga', 'Batter'], ['Nomvelo Sibanda', 'Bowler'], ['Tendai Makusha', 'Batting Allrounder'], ['Olinder Chare', 'Bowler']]
            }
          },
          pakeng4: {
            date: 'Sun 25 Oct 2026', time: '1:00 PM PKT', toss: 'Pakistan won the toss and chose to bowl',
            venue: 'Gaddafi Stadium, Lahore', city: 'Lahore',
            potm: { name: 'Shadab Khan', line: '113* (not out)' },
            summary: 'England made 241 all out \u2014 Ben Duckett 105, with Shaheen Afridi taking 4/46. Pakistan then collapsed to 154/9 before Shadab Khan\u2019s unbeaten 113 dragged them home with one wicket to spare. Pakistan top the table with three wins from three and are already through to the final.',
            notes: { ENG: 'Ben Duckett 105 \u00b7 Shaheen Afridi 4/46', PAK: 'Shadab Khan 113* \u2014 rescued Pakistan from 154/9' },
            squads: [
              { head: 'Pakistan \u2014 Playing XI', list: PAK_XI_M4, note: 'Team news: Shadab Khan returns; Razaullah debuts in place of Naseem Shah, who dislocated two fingers in the warm-up.' },
              { head: 'England \u2014 Series Squad', list: ENG_SQUAD, note: 'England hand a debut to seamer Henry Crocombe. Jos Buttler misses the tour through injury; Jofra Archer is rested.' }
            ],
            highlights: [
              { t: 'Pre-Match Show \u2014 Pakistan vs England', s: 'Sports Central \u00b7 YouTube', u: 'https://www.youtube.com/watch?v=jb818F1nwgI' },
              { t: 'A Shade of Pink \u2014 Pakistan\u2019s Pink Day Kit', s: 'PCB \u00b7 YouTube Short', u: 'https://www.youtube.com/shorts/PJVvR38dsWI' }
            ]
          },
          nzind3: {
            date: 'Tue 27 Oct 2026', time: '12:00 PM PKT', venue: 'Wellington', city: 'Wellington'
          },
          paksl5: {
            date: 'Tue 27 Oct 2026', time: '1:00 PM PKT \u00b7 toss 12:30 PM', venue: 'Gaddafi Stadium, Lahore', city: 'Lahore',
            note: 'Pakistan are already in the final \u2014 this match helps decide who joins them.',
            squads: [
              { head: 'Pakistan \u2014 Series Squad', list: PAK_SQUAD },
              { head: 'Sri Lanka', text: SL_NOTE }
            ]
          },
          rsa3: {
            date: 'Tue 27 \u2013 Sat 31 Oct 2026', venue: 'Newlands, Cape Town', city: 'Cape Town'
          },
          sleng3: {
            date: 'Thu 22 Oct 2026', time: '1:00 PM PKT', venue: 'Rawalpindi', city: 'Rawalpindi',
            summary: 'England piled up 429/4 behind Harry Brook\u2019s 202, but Sri Lanka chased it down \u2014 430/8 \u2014 to win by 2 wickets in one of the great ODI chases.',
            notes: { ENG: 'Harry Brook 202 off 116 balls', SL: 'Chased down 430 to win by 2 wickets' },
            squads: [
              { head: 'England \u2014 Series Squad', list: ENG_SQUAD },
              { head: 'Sri Lanka', text: SL_NOTE }
            ]
          },
          indw3: {
            date: 'Wed 28 Oct 2026', time: '2:00 PM IST (1:30 PM PKT)', venue: 'BCA Stadium, Kotambi, Vadodara', city: 'Vadodara'
          },
          paksl1: {
            date: 'Sun 18 Oct 2026', time: '1:00 PM PKT', venue: 'Rawalpindi', city: 'Rawalpindi',
            summary: 'Salman Ali Agha\u2019s 107 set up Pakistan\u2019s 305 all out; Sri Lanka were bowled out for 268 \u2014 Pakistan won by 37 runs.',
            notes: { PAK: 'Salman Ali Agha 107' },
            squads: [
              { head: 'Pakistan \u2014 Series Squad', list: PAK_SQUAD },
              { head: 'Sri Lanka', text: SL_NOTE }
            ]
          },
          banwi1: {
            date: 'Wed 28 Oct \u2013 Sun 1 Nov 2026', venue: 'Shere Bangla Stadium, Dhaka', city: 'Dhaka'
          },
          pakeng2: {
            date: 'Tue 20 Oct 2026', time: '1:00 PM PKT', venue: 'Rawalpindi', city: 'Rawalpindi',
            summary: 'Pakistan\u2019s 302/9 proved far too many: Arafat Minhas followed his 59 with 6/40 as England were bowled out for 215 \u2014 Pakistan won by 87 runs.',
            notes: { PAK: 'Arafat Minhas 59', ENG: 'Arafat Minhas took 6/40' },
            squads: [
              { head: 'Pakistan \u2014 Series Squad', list: PAK_SQUAD },
              { head: 'England \u2014 Series Squad', list: ENG_SQUAD }
            ],
            highlights: [
              { t: 'Arafat Minhas\u2019 Brilliant 6-Wicket Haul', s: 'Pakistan vs England \u00b7 Match 2 \u00b7 PCB / Sports Central', u: 'https://www.youtube.com/watch?v=WfJyQllWrRM' }
            ]
          },
          afgzim: {
            match: 'Series \u2014 2 Tests & 3 T20Is', series: 'Afghanistan vs Zimbabwe in the UAE',
            date: 'Starts Tue 27 Oct 2026', venue: 'UAE'
          },
          sleng6: {
            date: 'Thu 29 Oct 2026', time: '1:00 PM PKT', venue: 'Gaddafi Stadium, Lahore', city: 'Lahore',
            squads: [
              { head: 'England \u2014 Series Squad', list: ENG_SQUAD },
              { head: 'Sri Lanka', text: SL_NOTE }
            ]
          },
          nzind4: {
            date: 'Fri 30 Oct 2026', venue: 'Eden Park, Auckland', city: 'Auckland'
          },
          final: {
            date: 'Sat 31 Oct 2026', time: '1:00 PM PKT', venue: 'Gaddafi Stadium, Lahore', city: 'Lahore',
            squads: [
              { head: 'Pakistan \u2014 Series Squad', list: PAK_SQUAD },
              { head: 'The Other Finalist', text: 'Decided on Thu 29 Oct, when Sri Lanka play England in Lahore.' }
            ]
          }
        };
        var mdBackdrop = document.getElementById('mdBackdrop');
        var mdBody = document.getElementById('mdBody');
        var mdTitle = document.getElementById('mdTitle');
        var mdSub = document.getElementById('mdSub');
        var mdTag = document.getElementById('mdTag');
        var mdTabBtns = Array.prototype.slice.call(document.querySelectorAll('.md-tab'));
        var cur = null;
        var lastCard = null;

        function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
        function initials(name) {
          var p = String(name).replace(/\*/g, '').split(' ');
          return (p[0].charAt(0) + (p.length > 1 ? p[p.length - 1].charAt(0) : '')).toUpperCase();
        }
        function readCard(card) {
          var teams = [];
          Array.prototype.forEach.call(card.querySelectorAll('.mc-row'), function (row) {
            var flag = row.querySelector('.mc-flag');
            var score = row.querySelector('.mc-score');
            teams.push({
              code: row.querySelector('.mc-code').textContent.trim(),
              flagText: flag.textContent.trim(),
              flagStyle: flag.getAttribute('style') || '',
              score: score ? score.innerHTML : '',
              dim: row.classList.contains('dim')
            });
          });
          var statusEl = card.querySelector('.mc-status');
          var status = statusEl.textContent.trim();
          var cut = status.indexOf(' \u2014 ');
          var foot = card.querySelector('.mc-foot a');
          var href = foot ? foot.getAttribute('href') : '';
          var mid = card.getAttribute('data-mid') || '';
          return {
            series: card.querySelector('.mc-series').textContent.trim(),
            tag: card.querySelector('.mc-head .tag').textContent.trim(),
            teams: teams,
            soon: statusEl.classList.contains('soon'),
            status: status,
            resultLine: cut >= 0 ? status.slice(cut + 3) : status,
            ext: /^https:\/\/www\.cricbuzz\.com\//.test(href) ? href : null,
            d: MD[mid] || {}
          };
        }
        function flagHtml(t) { return '<span class="mc-flag" style="' + t.flagStyle + '">' + esc(t.flagText) + '</span>'; }
        function rowHtml(t) {
          return '<div class="md-srow' + (t.dim ? ' dim' : '') + '">' + flagHtml(t) +
            '<span class="mc-code">' + esc(t.code) + '</span>' +
            (t.score ? '<span class="mc-score">' + t.score + '</span>' : '') + '</div>';
        }
        function hasScores() { return cur.teams.some(function (t) { return !!t.score; }); }
        function whenLine() {
          var d = cur.d;
          return [d.date, d.time, d.venue].filter(Boolean).map(esc).join(' \u00b7 ');
        }
        function actionsHtml(primaryLabel) {
          var h = '<div class="md-actions">';
          if (cur.ext) h += '<a class="md-act primary" href="' + cur.ext + '" target="_blank" rel="noopener">' + esc(primaryLabel || 'Full Scorecard \u2014 Cricbuzz (Free)') + '</a>';
          h += '<button class="md-act" type="button" data-goto="#channels">Free Channels</button>';
          h += '<button class="md-act" type="button" data-goto="#schedule">Schedule</button>';
          return h + '</div>';
        }
        function tabLiveHtml() {
          var d = cur.d;
          var h = '<div class="md-score">' + cur.teams.map(rowHtml).join('') + '</div>';
          h += '<p class="md-result' + (cur.soon ? ' soon' : '') + '">' + esc(cur.resultLine) + '</p>';
          if (!hasScores() && whenLine()) h += '<p class="md-note">' + whenLine() + '</p>';
          if (d.potm) {
            h += '<h3 class="md-h">Player of the Match</h3><div class="md-potm"><span class="md-avatar" aria-hidden="true">' + esc(initials(d.potm.name)) + '</span><span><span class="md-potm-name">' + esc(d.potm.name) + '</span><br /><span class="md-potm-line">' + esc(d.potm.line) + '</span></span></div>';
          }
          if (d.summary) h += '<h3 class="md-h">Match Summary</h3><p style="margin:0">' + esc(d.summary) + '</p>';
          else if (d.note) h += '<p class="md-note">' + esc(d.note) + '</p>';
          h += actionsHtml();
          return h;
        }
        function tabInfoHtml() {
          var d = cur.d;
          var parts = cur.series.split(' \u00b7 ');
          var rows = '';
          function r(k, v) { if (v) rows += '<tr><td class="k">' + esc(k) + '</td><td class="v">' + esc(v) + '</td></tr>'; }
          r('Match', d.match || parts[0]);
          r('Series', d.series || (parts.length > 1 ? parts.slice(1).join(' \u00b7 ') : parts[0]));
          r('Date', d.date);
          r('Time', d.time);
          r('Toss', d.toss);
          r('Venue', d.venue);
          r('Status', cur.tag);
          var h = '<table class="md-info"><tbody>' + rows + '</tbody></table>';
          if (d.venue && d.city) {
            h += '<h3 class="md-h">Venue Guide</h3><table class="md-info"><tbody>' +
              '<tr><td class="k">Stadium</td><td class="v">' + esc(d.venue) + '</td></tr>' +
              '<tr><td class="k">City</td><td class="v">' + esc(d.city) + '</td></tr></tbody></table>';
          }
          h += '<p class="md-note">' + esc(cur.resultLine) + '</p>';
          h += actionsHtml();
          return h;
        }
        function tabScoreHtml() {
          var d = cur.d;
          if (!hasScores()) {
            var when = whenLine();
            return '<p class="md-note">This match has not started, so there is no scorecard yet.' + (when ? ' It is on ' + when + '.' : '') + '</p>' + actionsHtml('Live Scorecard \u2014 Cricbuzz (Free)');
          }
          var h = '';
          cur.teams.forEach(function (t) {
            if (!t.score) return;
            h += '<div class="md-inn">' + rowHtml(t);
            var note = d.notes && d.notes[t.code];
            if (note) h += '<div class="md-inn-note">' + esc(note) + '</div>';
            h += '</div>';
          });
          h += '<p class="md-result' + (cur.soon ? ' soon' : '') + '">' + esc(cur.resultLine) + '</p>';
          if (cur.ext) h += '<div class="md-actions"><a class="md-act primary" href="' + cur.ext + '" target="_blank" rel="noopener">Full Ball-by-Ball Scorecard \u2014 Cricbuzz (Free)</a></div>';
          else h += '<p class="md-note">The full ball-by-ball card for this match is free on Cricbuzz and ESPNcricinfo \u2014 see the Channels section.</p>' + actionsHtml();
          return h;
        }
        function tabSquadsHtml() {
          var d = cur.d;
          if (d.pair) {
            function col(t, list) {
              var c = '<div class="md-xi-col"><div class="md-xi-head">' + flagHtml(t) + esc(t.code) + '</div><ul>';
              list.forEach(function (p) { c += '<li>' + esc(p[0]) + '<span>' + esc(p[1]) + '</span></li>'; });
              return c + '</ul></div>';
            }
            return '<h3 class="md-h">Playing XI</h3><div class="md-xi">' + col(cur.teams[0], d.pair.A) + col(cur.teams[1], d.pair.B) + '</div>';
          }
          if (d.squads) {
            var h = '';
            d.squads.forEach(function (s) {
              h += '<h3 class="md-h">' + esc(s.head) + '</h3>';
              if (s.list) h += '<ul class="md-squad-list">' + s.list.map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('') + '</ul>';
              if (s.text) h += '<p style="margin:0">' + esc(s.text) + '</p>';
              if (s.note) h += '<p class="md-note">' + esc(s.note) + '</p>';
            });
            return h;
          }
          return '<p class="md-note">The playing XIs for this match are announced at the toss. Follow the free coverage on the country channels in the meantime.</p>' +
            '<div class="md-actions"><button class="md-act" type="button" data-goto="#countries">Country Channels</button><button class="md-act" type="button" data-goto="#channels">Free Channels</button></div>';
        }
        function tabOversHtml() {
          var h = '<p class="md-note">' + (hasScores()
            ? 'This page is a snapshot, so it cannot run ball-by-ball overs itself \u2014 but every over of this match is free on the Cricbuzz scorecard, ball by ball.'
            : 'This match has not started yet. Once play begins, every over is carried ball by ball on the free scorecard.') + '</p>';
          if (cur.ext) h += '<div class="md-actions"><a class="md-act primary" href="' + cur.ext + '" target="_blank" rel="noopener">Overs &amp; Commentary \u2014 Cricbuzz (Free)</a></div>';
          else h += '<div class="md-actions"><button class="md-act" type="button" data-goto="#channels">Free Live Scores</button></div>';
          return h;
        }
        function tabHighlightsHtml() {
          var d = cur.d;
          if (d.highlights) {
            return d.highlights.map(function (v) {
              return '<a class="md-hl" href="' + v.u + '" target="_blank" rel="noopener"><span class="play"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg></span><span><span class="md-hl-t">' + esc(v.t) + '</span><br /><span class="md-hl-s">' + esc(v.s) + '</span></span></a>';
            }).join('') + '<p class="md-note">All highlights here are on the official PCB and Sports Central YouTube channels \u2014 free to watch any time.</p>';
          }
          return '<p class="md-note">Highlights from this series go up free on the official YouTube channels \u2014 PCB and Sports Central for the Pakistan series, the ICC channel for the world matches.</p>' +
            '<div class="md-actions"><button class="md-act" type="button" data-goto="#channels">Free Channels</button><button class="md-act" type="button" data-goto="#highlights">This Page\u2019s Highlights</button></div>';
        }
        function renderTab(name) {
          var h = '';
          if (name === 'live') h = tabLiveHtml();
          else if (name === 'info') h = tabInfoHtml();
          else if (name === 'scorecard') h = tabScoreHtml();
          else if (name === 'squads') h = tabSquadsHtml();
          else if (name === 'overs') h = tabOversHtml();
          else if (name === 'highlights') h = tabHighlightsHtml();
          mdBody.innerHTML = h;
          mdBody.scrollTop = 0;
          mdTabBtns.forEach(function (b) { b.setAttribute('aria-selected', b.getAttribute('data-tab') === name ? 'true' : 'false'); });
        }
        function openMatch(card) {
          cur = readCard(card);
          lastCard = card;
          mdTitle.textContent = cur.teams.map(function (t) { return t.flagText; }).join(' v ');
          mdSub.textContent = cur.series;
          mdTag.textContent = cur.tag;
          renderTab('live');
          mdBackdrop.hidden = false;
          document.body.style.overflow = 'hidden';
          document.getElementById('mdBack').focus();
        }
        var returnToCountry = false;
        function closeMatch() {
          mdBackdrop.hidden = true;
          if (returnToCountry) {
            returnToCountry = false;
            ctBackdrop.hidden = false;
            document.getElementById('ctBack').focus();
            return;
          }
          document.body.style.overflow = '';
          if (lastCard) lastCard.focus();
        }
        document.getElementById('mdBack').addEventListener('click', closeMatch);
        mdBackdrop.addEventListener('click', function (e) { if (e.target === mdBackdrop) closeMatch(); });
        document.addEventListener('keydown', function (e) {
          if (e.key !== 'Escape') return;
          if (!mdBackdrop.hidden) closeMatch();
          else if (typeof ctBackdrop !== 'undefined' && ctBackdrop && !ctBackdrop.hidden) closeCountry();
        });
        mdTabBtns.forEach(function (b) { b.addEventListener('click', function () { renderTab(b.getAttribute('data-tab')); }); });
        mdBody.addEventListener('click', function (e) {
          var btn = e.target.closest ? e.target.closest('[data-goto]') : null;
          if (!btn) return;
          var target = document.querySelector(btn.getAttribute('data-goto'));
          closeMatch();
          if (target) target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
        });
        matchCards.forEach(function (card) {
          card.setAttribute('tabindex', '0');
          card.setAttribute('role', 'button');
          var codes = Array.prototype.map.call(card.querySelectorAll('.mc-flag'), function (f) { return f.textContent.trim(); });
          card.setAttribute('aria-label', 'Open match details: ' + card.querySelector('.mc-series').textContent.trim() + ' \u2014 ' + codes.join(' v '));
          card.addEventListener('click', function (e) {
            if (e.target.closest && e.target.closest('.mc-foot')) return;
            openMatch(card);
          });
          card.addEventListener('keydown', function (e) {
            if ((e.key === 'Enter' || e.key === ' ') && !(e.target.closest && e.target.closest('a, button'))) {
              e.preventDefault();
              openMatch(card);
            }
          });
        });

        /* Country matches — tapping a country card lists every match that
           country plays in the world strip above, in one panel. The panel
           is built from the match cards themselves, so it always matches
           the strip; tapping a match opens its full match view, and Back
           from there returns to the country's list. */
        var COUNTRY_TEAMS = { PAK: ['PAK'], IND: ['IND', 'INDW'], AUS: ['AUS'], ENG: ['ENG'], RSA: ['RSA'], NZL: ['NZ'], SRI: ['SL'], BAN: ['BAN'], WIN: ['WI'], AFG: ['AFG'], IRE: [], ZIM: ['ZIM', 'ZIMW'] };
        /* Watch Live: each country's free YouTube channels only (the user's
           "show only youtube" rule) — no TV, radio or streaming sites here;
           those stay in the Free Channels grid. Entries carry the channel's
           name, honest labels and link from the cards already on this page.
           yt/ytm wire a channel into the in-page player: ytm 'live' embeds
           the channel's live stream, 'uploads' its latest videos. Only
           channels whose YouTube channel ID is verified get yt; the rest
           simply open on YouTube, as before. u is the card's own link; a
           '#…' link stays on this page. */
        var COUNTRY_CHANNELS = {
          PAK: [
            { tile: 'SC', bg: '#c92424', name: 'Sports Central', tag: 'Free', note: 'Blocked in Pakistan — plays outside Pakistan only', desc: 'PCB\u2019s official YouTube streaming partner. Pakistan matches streamed here free in most countries; inside Pakistan this stream is blocked.', go: 'Open the live stream (outside Pakistan) \u2192', u: 'https://www.youtube.com/watch?v=Ni-4S8Dlm-A', yt: 'UC-fzWbU1zavz77kP1gPPdSg', ytm: 'live' },
            { tile: 'PCB', bg: '#0d7a3e', name: 'Pakistan Cricket — YouTube', tag: 'Free', desc: 'The PCB\u2019s own channel: free highlights of every Pakistan match, plus live streams of domestic and women\u2019s cricket, interviews and press conferences.', go: 'Open the channel \u2192', u: 'https://bit.ly/SubscribePakistanCricket', yt: 'UCiWrjBhlICf_L_RK5y6Vrxw', ytm: 'live' },
            { tile: 'PSL', bg: '#0b6e4f', name: 'Pakistan Super League — YouTube', tag: 'Free', desc: 'Pakistan\u2019s league channel: the official HBL PSL YouTube channel — free highlights of every PSL match, plus shows and player features. Highlights and shows, not full live matches.', go: 'Open PSL on YouTube \u2192', u: 'https://www.youtube.com/@pakistansuperleagueofficial', yt: 'UCpNzXJ5jpcJojC5mHQvGA8w', ytm: 'uploads' }
          ],
          IND: [
            { tile: 'IND', bg: '#1256a0', name: 'BCCI — India on YouTube', tag: 'Free', desc: 'The BCCI\u2019s official channel: Team India highlights, interviews and features, plus Indian domestic cricket — all free to watch on YouTube.', go: 'Open BCCI on YouTube \u2192', u: 'https://www.youtube.com/channel/UCAqfuhLGIDCvrtp70YNRQYw', yt: 'UCAqfuhLGIDCvrtp70YNRQYw', ytm: 'uploads' },
            { tile: 'IPL', bg: '#1e3a8a', name: 'IPL — YouTube', tag: 'Free', desc: 'India\u2019s league channel: the Indian Premier League\u2019s official YouTube channel — free highlights of every IPL match, the biggest sixes and wickets, interviews and behind-the-scenes. Highlights, not full live matches.', go: 'Open IPL on YouTube \u2192', u: 'https://www.youtube.com/@IPLT20Official' }
          ],
          AUS: [
            { tile: 'AUS', bg: '#946b00', name: 'Cricket Australia — YouTube', tag: 'Free', desc: 'Cricket Australia\u2019s cricket.com.au channel: match highlights and interviews, and free live streams of Australian domestic cricket like the Sheffield Shield.', go: 'Open Cricket Australia \u2192', u: 'https://www.youtube.com/cricketcomau' },
            { tile: 'BBL', bg: '#b45309', name: 'Big Bash League — YouTube', tag: 'Free', desc: 'Australia\u2019s league channel: the Big Bash\u2019s official YouTube channel — free highlights of every BBL and WBBL match, top catches and big hits. Highlights, not full live matches.', go: 'Open Big Bash on YouTube \u2192', u: 'https://www.youtube.com/@BigBash' }
          ],
          ENG: [
            { tile: 'ENG', bg: '#1b3a6b', name: 'ECB — England on YouTube', tag: 'Free', desc: 'The ECB\u2019s official channel: England highlights from Tests, ODIs and T20s, plus County Championship and Vitality Blast action.', go: 'Open ECB on YouTube \u2192', u: 'https://www.youtube.com/ecbcricket', yt: 'UCz1D0n02BR3t51KuBOPmfTQ', ytm: 'uploads' },
            { tile: '100', bg: '#5b21b6', name: 'The Hundred — YouTube', tag: 'Free', desc: 'England\u2019s league channel: the official YouTube channel of the 100-ball league — free highlights of every men\u2019s and women\u2019s match, top plays and player stories. Highlights, not full live matches.', go: 'Open The Hundred on YouTube \u2192', u: 'https://www.youtube.com/@thehundred' }
          ],
          RSA: [
            { tile: 'RSA', bg: '#0a6b3a', name: 'ProteasCricket — YouTube', tag: 'Free', desc: 'ProteasCricket — Cricket South Africa\u2019s official channel: Proteas highlights, women\u2019s matches and free live streams of South African domestic cricket.', go: 'Open Proteas on YouTube \u2192', u: 'https://www.youtube.com/channel/UC1xHJoiSXk4JGRlSG1XrjYg', yt: 'UC1xHJoiSXk4JGRlSG1XrjYg', ytm: 'uploads' }
          ],
          NZL: [
            { tile: 'NZC', bg: '#111111', name: 'New Zealand Cricket — YouTube', tag: 'Free', desc: 'NZC\u2019s official YouTube channel: free live streams of A-team and domestic matches — Super Smash, Plunket Shield and more — plus BLACKCAPS and White Ferns highlights.', go: 'Watch NZC on YouTube \u2192', u: 'https://www.youtube.com/channel/UCuKowzPg2-A0FcmyPa3yWug', yt: 'UCuKowzPg2-A0FcmyPa3yWug', ytm: 'live' }
          ],
          SRI: [
            { tile: 'SRI', bg: '#8d153a', name: 'Sri Lanka Cricket — YouTube', tag: 'Free', desc: 'Sri Lanka Cricket\u2019s official channel — one of the best free ones: home series and domestic matches are regularly streamed live here, free, plus full highlights.', go: 'Open Sri Lanka Cricket \u2192', u: 'https://www.youtube.com/srilankacricket' }
          ],
          BAN: [
            { tile: 'RH', bg: '#006a4e', name: 'Rabbitholebd Sports — YouTube', tag: 'Free', desc: 'Bangladesh\u2019s official digital rights holder: Bangladesh home series stream live and free on this YouTube channel, with highlights after every match. If Bangladesh are playing at home, this is the free place to watch.', go: 'Open Rabbitholebd Sports \u2192', u: 'https://www.youtube.com/c/RabbitholebdSports/', yt: 'UCNU0Vv6U1xZS82cIQrgDeqw', ytm: 'live' },
            { tile: 'BAN', bg: '#006a4e', name: 'Bangladesh Cricket: The Tigers — YouTube', tag: 'Free', desc: 'The BCB\u2019s official channel: live streams of domestic cricket like the NCL, Tigers highlights and player interviews, all free.', go: 'Open BCB on YouTube \u2192', u: 'https://www.youtube.com/c/BangladeshCricketTheTigersOfficial' }
          ],
          WIN: [
            { tile: 'WIN', bg: '#7b0041', name: 'Windies Cricket — YouTube', tag: 'Free', desc: 'Windies Cricket streams Caribbean cricket live and free: the West Indies Championship, the women\u2019s T20 Blaze and regional tournaments, plus international highlights.', go: 'Open Windies on YouTube \u2192', u: 'https://www.youtube.com/@windiescricket' }
          ],
          AFG: [
            { tile: 'AFG', bg: '#1d4e89', name: 'Afghanistan Cricket Board — YouTube', tag: 'Free', desc: 'The Afghanistan Cricket Board\u2019s official channel: Afghan Atalan highlights, live domestic cricket, training and press conferences — home of Rashid Khan\u2019s team.', go: 'Open ACB on YouTube \u2192', u: 'https://bit.ly/AfghanistanCricketBoard' }
          ],
          IRE: [
            { tile: 'IRE', bg: '#169b62', name: 'Cricket Ireland Live — YouTube', tag: 'Free', desc: 'Cricket Ireland Live streams Irish domestic and inter-provincial cricket free on YouTube, with national-team news, interviews and highlights.', go: 'Open Cricket Ireland \u2192', u: 'https://www.youtube.com/CricketIrelandLive' }
          ],
          ZIM: [
            { tile: 'ZIM', bg: '#c8102e', name: 'Zimbabwe Cricket — YouTube', tag: 'Free', desc: 'Zimbabwe Cricket\u2019s official channel: free live streams of the Pro50 Championship and Logan Cup, plus women\u2019s internationals and Chevrons highlights.', go: 'Open Zimbabwe Cricket \u2192', u: 'https://www.youtube.com/channel/UCe-5I6Hd1Oxy9xke1a_LIaQ', yt: 'UCe-5I6Hd1Oxy9xke1a_LIaQ', ytm: 'uploads' }
          ]
        };
        var ctBackdrop = document.getElementById('ctBackdrop');
        var ctBody = document.getElementById('ctBody');
        var ctTitle = document.getElementById('ctTitle');
        var ctSub = document.getElementById('ctSub');
        var lastCountryCard = null;
        function countryMatches(code) {
          var wanted = COUNTRY_TEAMS[code] || [];
          return matchCards.filter(function (card) {
            var codes = Array.prototype.map.call(card.querySelectorAll('.mc-flag'), function (f) { return f.textContent.trim(); });
            return codes.some(function (c) { return wanted.indexOf(c) !== -1; });
          });
        }
        var curCountry = null;
        var ctChoiceWatch = document.getElementById('ctChoiceWatch');
        var ctChoiceScores = document.getElementById('ctChoiceScores');
        /* One channel card, exactly as the country Watch Live view shows it —
           same name, same honest labels, same link. Used by both the country
           panel and the match cards' Watch Live view. */
        function chanCardHtml(c) {
          var internal = c.u.charAt(0) === '#';
          var ytAttrs = c.yt ? ' data-yt="' + esc(c.yt) + '" data-ytmode="' + esc(c.ytm || 'live') + '" data-ytname="' + esc(c.name) + '"' : '';
          return '<a class="ct-chan" href="' + esc(c.u) + '"' + (internal ? ' data-goto="' + esc(c.u) + '"' : ' target="_blank" rel="noopener"') + ytAttrs + '>' +
            '<div class="card-top"><span class="logo-tile" style="background:' + esc(c.bg) + '">' + esc(c.tile) + '</span><h4>' + esc(c.name) + '</h4><span class="tag tag-free">' + esc(c.tag) + '</span></div>' +
            (c.note ? '<span class="blocked-note">' + esc(c.note) + '</span>' : '') +
            '<p>' + esc(c.desc) + '</p>' +
            '<span class="go">' + esc(c.go) + '</span></a>';
        }
        function renderCountryScores() {
          var name = curCountry.name;
          var found = countryMatches(curCountry.code);
          ctTitle.textContent = name + ' \u2014 Scores';
          ctSub.textContent = found.length ? found.length + (found.length === 1 ? ' match' : ' matches') + ' in the world strip \u2014 tap one for its full match view' : 'No matches in this week\u2019s world strip';
          var h = '';
          if (found.length) {
            found.forEach(function (mc) {
              var m = readCard(mc);
              h += '<button class="ct-item" type="button" data-mid="' + esc(mc.getAttribute('data-mid') || '') + '" aria-label="' + esc(m.series) + ' \u2014 ' + esc(m.teams.map(function (t) { return t.flagText; }).join(' v ')) + ' (in ' + esc(name) + ' matches)">' +
                '<span class="ct-item-head"><span class="mc-series">' + esc(m.series) + '</span><span class="tag">' + esc(m.tag) + '</span></span>' +
                '<span class="md-score">' + m.teams.map(rowHtml).join('') + '</span>' +
                '<span class="ct-item-status' + (m.soon ? ' soon' : '') + '">' + esc(m.status) + '</span></button>';
            });
          } else {
            h = '<p class="md-note">' + esc(name) + ' have no match in this week\u2019s world strip. Their free official channel is on the card you just tapped \u2014 and when ' + esc(name) + ' play, their matches show up in the strip at the top of this page.</p>';
          }
          h += '<div class="md-actions"><button class="md-act" type="button" id="ctAllBtn">\u2190 Back to All Matches</button></div>';
          ctBody.innerHTML = h;
          ctBody.scrollTop = 0;
          var allBtn = document.getElementById('ctAllBtn');
          if (allBtn) allBtn.addEventListener('click', closeCountry);
          Array.prototype.forEach.call(ctBody.querySelectorAll('.ct-item'), function (item) {
            item.addEventListener('click', function () {
              var target = null;
              matchCards.forEach(function (mc) { if (mc.getAttribute('data-mid') === item.getAttribute('data-mid')) target = mc; });
              if (!target) return;
              ctBackdrop.hidden = true;
              returnToCountry = true;
              openMatch(target);
            });
          });
        }
        function renderCountryWatch() {
          var name = curCountry.name;
          var chans = COUNTRY_CHANNELS[curCountry.code] || [];
          ctTitle.textContent = name + ' \u2014 Watch Live';
          ctSub.textContent = chans.length + (chans.length === 1 ? ' free YouTube channel' : ' free YouTube channels') + ' for ' + name + ' \u2014 every one free and official';
          var h = '<p class="md-note" style="margin:0 0 14px">' + esc(name) + '\u2019s free official YouTube channels \u2014 live streams, highlights and shows, all on YouTube. Tap one to play it right here.</p>';
          chans.forEach(function (c) { h += chanCardHtml(c); });
          h += '<div class="md-actions"><button class="md-act" type="button" id="ctScoresBtn">See ' + esc(name) + '\u2019s scores instead</button></div>';
          ctBody.innerHTML = h;
          ctBody.scrollTop = 0;
          var scBtn = document.getElementById('ctScoresBtn');
          if (scBtn) scBtn.addEventListener('click', function () { setCountryView('scores'); });
        }
        function setCountryView(view) {
          ctChoiceWatch.setAttribute('aria-pressed', view === 'watch' ? 'true' : 'false');
          ctChoiceScores.setAttribute('aria-pressed', view === 'scores' ? 'true' : 'false');
          if (!curCountry) return;
          if (view === 'watch') renderCountryWatch(); else renderCountryScores();
        }
        ctChoiceWatch.addEventListener('click', function () { setCountryView('watch'); });
        ctChoiceScores.addEventListener('click', function () { setCountryView('scores'); });
        ctBody.addEventListener('click', function (e) {
          var link = e.target.closest ? e.target.closest('[data-goto]') : null;
          if (!link) return;
          e.preventDefault();
          var target = document.querySelector(link.getAttribute('data-goto'));
          closeCountry();
          if (target) target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
        });
        function openCountry(card) {
          var name = card.querySelector('h3').textContent.trim();
          var code = card.querySelector('.logo-tile').textContent.trim().toUpperCase();
          lastCountryCard = card;
          curCountry = { name: name, code: code };
          setCountryView('scores');
          ctBackdrop.hidden = false;
          document.body.style.overflow = 'hidden';
          document.getElementById('ctBack').focus();
        }
        function closeCountry() {
          ctBackdrop.hidden = true;
          document.body.style.overflow = '';
          if (lastCountryCard) lastCountryCard.focus();
        }
        document.getElementById('ctBack').addEventListener('click', closeCountry);
        ctBackdrop.addEventListener('click', function (e) { if (e.target === ctBackdrop) closeCountry(); });
        countryCards.forEach(function (card) {
          card.setAttribute('tabindex', '0');
          card.setAttribute('role', 'button');
          card.setAttribute('aria-label', 'Open ' + card.querySelector('h3').textContent.trim() + ': watch live channels or scores');
          card.addEventListener('click', function (e) {
            if (e.target.closest && e.target.closest('a')) return;
            openCountry(card);
          });
          card.addEventListener('keydown', function (e) {
            if ((e.key === 'Enter' || e.key === ' ') && !(e.target.closest && e.target.closest('a'))) {
              e.preventDefault();
              openCountry(card);
            }
          });
        });

        /* Match card buttons — every card in the world rail gets Watch Live
           and Scores. Scores opens the match's full match view (the same as
           tapping the card). Watch Live opens the free channels for BOTH
           teams in that match, grouped by country, reusing the exact
           COUNTRY_CHANNELS mapping behind the country view's Watch Live tab.
           Each button stops propagation, so it never also fires the card's
           own tap behaviour, and the card tap never fires the buttons. */
        var TEAM_COUNTRY = { PAK: 'PAK', ENG: 'ENG', SL: 'SRI', IND: 'IND', INDW: 'IND', NZ: 'NZL', RSA: 'RSA', AUS: 'AUS', BAN: 'BAN', WI: 'WIN', AFG: 'AFG', ZIM: 'ZIM', ZIMW: 'ZIM' };
        var COUNTRY_NAMES = { PAK: 'Pakistan', IND: 'India', AUS: 'Australia', ENG: 'England', RSA: 'South Africa', NZL: 'New Zealand', SRI: 'Sri Lanka', BAN: 'Bangladesh', WIN: 'West Indies', AFG: 'Afghanistan', IRE: 'Ireland', ZIM: 'Zimbabwe' };
        var mwBackdrop = document.getElementById('mwBackdrop');
        var mwBody = document.getElementById('mwBody');
        var mwTitle = document.getElementById('mwTitle');
        var mwSub = document.getElementById('mwSub');
        var lastWatchCard = null;
        function openMatchWatch(card) {
          var m = readCard(card);
          lastWatchCard = card;
          mwTitle.textContent = m.teams.map(function (t) { return t.flagText; }).join(' v ') + ' — Watch Live';
          mwSub.textContent = m.series;
          var h = '<p class="md-note" style="margin:0 0 4px">Free YouTube channels for both teams in this match \u2014 every one official, with the same honest labels as the channel list. Tap one to play it right here.</p>';
          var seen = {};
          var unknown = false;
          m.teams.forEach(function (t) {
            var key = TEAM_COUNTRY[t.flagText];
            if (!key) { unknown = true; return; }
            if (seen[key]) return;
            seen[key] = true;
            h += '<h3 class="mw-group-head">' + flagHtml(t) + esc(COUNTRY_NAMES[key] || t.code) + '</h3>';
            (COUNTRY_CHANNELS[key] || []).forEach(function (c) { h += chanCardHtml(c); });
          });
          if (unknown) h += '<p class="md-note">One team in this match is still to be confirmed — their free channels will appear here once they are known.</p>';
          mwBody.innerHTML = h;
          mwBody.scrollTop = 0;
          mwBackdrop.hidden = false;
          document.body.style.overflow = 'hidden';
          document.getElementById('mwBack').focus();
        }
        function closeMatchWatch() {
          mwBackdrop.hidden = true;
          document.body.style.overflow = '';
          if (lastWatchCard) lastWatchCard.focus();
        }
        document.getElementById('mwBack').addEventListener('click', closeMatchWatch);
        mwBackdrop.addEventListener('click', function (e) { if (e.target === mwBackdrop) closeMatchWatch(); });
        document.addEventListener('keydown', function (e) {
          if (e.key === 'Escape' && !mwBackdrop.hidden) closeMatchWatch();
        });
        mwBody.addEventListener('click', function (e) {
          var link = e.target.closest ? e.target.closest('[data-goto]') : null;
          if (!link) return;
          e.preventDefault();
          var target = document.querySelector(link.getAttribute('data-goto'));
          closeMatchWatch();
          if (target) target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
        });
        matchCards.forEach(function (card) {
          var teamsLabel = Array.prototype.map.call(card.querySelectorAll('.mc-flag'), function (f) { return f.textContent.trim(); }).join(' v ');
          var actions = document.createElement('div');
          actions.className = 'mc-actions';
          actions.innerHTML =
            '<button class="mc-btn mc-btn-watch" type="button" aria-label="Watch live — free channels for ' + teamsLabel + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>Watch Live</button>' +
            '<button class="mc-btn mc-btn-scores" type="button" aria-label="Scores — open the full match view for ' + teamsLabel + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10h3.2v9H4zM10.4 4h3.2v15h-3.2zM16.8 13H20v6h-3.2z"/></svg>Scores</button>';
          card.insertBefore(actions, card.querySelector('.mc-foot'));
          actions.querySelector('.mc-btn-watch').addEventListener('click', function (e) {
            e.stopPropagation();
            openMatchWatch(card);
          });
          actions.querySelector('.mc-btn-scores').addEventListener('click', function (e) {
            e.stopPropagation();
            openMatch(card);
          });
        });

        /* In-page YouTube player — tapping a YouTube channel card that
           carries a verified channel ID plays right here instead of
           sending the visitor away: streaming channels embed their live
           stream (YouTube shows its own notice inside when they are not
           live), highlights channels embed their latest uploads. The
           "Open on YouTube" link stays as the fallback for channels that
           have embedding turned off. A plain iframe — no new windows — so
           it works inside the installed app's WebView too. */
        var ytBackdrop = document.getElementById('ytBackdrop');
        var ytFrame = document.getElementById('ytFrame');
        var lastPlayerTrigger = null;
        /* App-style: every playable channel now loads into the big player
           pinned at the TOP of the page (same verified embeds as before:
           live_stream for live channels, the uploads playlist for
           highlights channels) instead of a pop-up — the visitor never
           leaves the page, and the player sticks under the header while
           a video plays so it stays reachable on scroll. */
        var topPlayer = document.getElementById('watch');
        var appFrame = document.getElementById('appFrame');
        var appEmpty = document.getElementById('appPlayerEmpty');
        var appName = document.getElementById('appPlayerName');
        var appStatus = document.getElementById('appPlayerStatus');
        var appNote = document.getElementById('appPlayerNote');
        var appActions = document.getElementById('appPlayerActions');
        var appOpen = document.getElementById('appPlayerOpen');
        var appStop = document.getElementById('appPlayerStop');
        var appDefaultNote = appNote ? appNote.textContent : '';
        function openPlayer(trigger) {
          var cid = trigger.getAttribute('data-yt');
          if (!cid || !topPlayer || !appFrame) return;
          var mode = trigger.getAttribute('data-ytmode') || 'live';
          lastPlayerTrigger = trigger;
          appFrame.src = mode === 'uploads'
            ? 'https://www.youtube.com/embed/videoseries?list=UU' + cid.slice(2) + '&autoplay=1&rel=0'
            : 'https://www.youtube.com/embed/live_stream?channel=' + cid + '&autoplay=1&rel=0';
          appFrame.hidden = false;
          var frameWrap = appFrame.parentElement;
          if (frameWrap) frameWrap.classList.add('has-video');
          if (appEmpty) appEmpty.style.display = 'none';
          if (appName) appName.textContent = trigger.getAttribute('data-ytname') || 'Watch';
          if (appStatus) appStatus.innerHTML = '<span class="live-dot"></span>' + (mode === 'uploads' ? 'Now Playing' : 'Live / Latest');
          if (appNote) appNote.textContent = mode === 'uploads'
            ? 'This channel\u2019s latest videos and highlights, playing right here at the top of this page. If the player stays blank, the channel has embedding turned off \u2014 use the button below to open it on YouTube instead.'
            : 'If this channel is live right now, the match plays right here at the top of this page. If it isn\u2019t live, YouTube shows its own notice inside the player \u2014 or use the button below to open the channel on YouTube.';
          if (appOpen) appOpen.href = trigger.getAttribute('href') || '#channels';
          if (appActions) appActions.hidden = false;
          if (appStop) appStop.hidden = false;
          topPlayer.classList.add('is-playing');
          /* If the tap came from inside a pop-up view (country / match
             Watch Live), close that view so the top player is what the
             visitor sees. */
          if (typeof returnToCountry !== 'undefined') returnToCountry = false;
          [mdBackdrop, ctBackdrop, mwBackdrop, ytBackdrop].forEach(function (b) { if (b) b.hidden = true; });
          document.body.style.overflow = '';
          window.dispatchEvent(new Event('resize'));
          window.requestAnimationFrame(function () {
            topPlayer.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
          });
        }
        function closePlayer() {
          if (appFrame) {
            appFrame.src = 'about:blank'; appFrame.hidden = true;
            if (appFrame.parentElement) appFrame.parentElement.classList.remove('has-video');
          }
          if (ytFrame) ytFrame.src = 'about:blank';
          if (ytBackdrop) ytBackdrop.hidden = true;
          if (topPlayer) {
            topPlayer.classList.remove('is-playing');
            if (appEmpty) appEmpty.style.display = '';
            if (appName) appName.textContent = 'No channel chosen yet';
            if (appStatus) appStatus.innerHTML = '<span class="live-dot" style="background:#ffd75e"></span>Free Player';
            if (appNote) appNote.textContent = appDefaultNote;
            if (appActions) appActions.hidden = true;
            if (appStop) appStop.hidden = true;
          }
          if (ctBackdrop.hidden && mwBackdrop.hidden && mdBackdrop.hidden) document.body.style.overflow = '';
          window.dispatchEvent(new Event('resize'));
          if (lastPlayerTrigger) lastPlayerTrigger.focus();
        }
        if (appStop) appStop.addEventListener('click', closePlayer);
        document.getElementById('ytBack').addEventListener('click', closePlayer);
        ytBackdrop.addEventListener('click', function (e) { if (e.target === ytBackdrop) closePlayer(); });
        document.addEventListener('keydown', function (e) {
          if (e.key === 'Escape' && !ytBackdrop.hidden) closePlayer();
        });
        document.addEventListener('click', function (e) {
          var t = e.target.closest ? e.target.closest('[data-yt]') : null;
          if (!t) return;
          e.preventDefault();
          openPlayer(t);
        });

        /* Install-the-app: one tap on any Install button opens the browser's own
           install dialog directly. Only when the browser offers no install dialog
           (iPhone Safari never does — Apple reserves installing for its Share sheet)
           do we show a single short hint line instead of step-by-step panels. */
        var deferredPrompt = null;
        var installMsg = document.getElementById('installMsg');
        var installHint = document.getElementById('installHint');
        var installBtns = Array.prototype.slice.call(document.querySelectorAll('[data-install-trigger]'));
        function standalone() {
          return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
        }
        /* True when the page is already running as the app: the installed PWA
           (standalone) or inside the Android APK's WebView ("; wv)" user agent).
           In-app visitors must never be offered the download again. */
        function inAppNow() {
          if (standalone()) return true;
          var ua = window.navigator.userAgent || '';
          return /;\s*wv\)/.test(ua);
        }
        function markInstalled() {
          installBtns.forEach(function (b) { b.style.display = 'none'; });
          if (installMsg) installMsg.textContent = 'Live Cricket is installed on this device — open it from your home screen.';
          if (installHint) installHint.hidden = true;
        }
        function showHint() {
          if (!installHint) return;
          var ua = window.navigator.userAgent || '';
          var isIOS = /iphone|ipad|ipod/i.test(ua) || (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
          if (isIOS) {
            installHint.innerHTML = 'On iPhone, Apple only allows installing from Safari\u2019s <b>Share</b> button \u2192 <b>\u201cAdd to Home Screen\u201d</b> \u2014 that one tap puts Live Cricket on your home screen.';
          } else {
            installHint.innerHTML = 'Your browser hasn\u2019t offered its install box yet \u2014 on Android, just use the gold <b>Download APK</b> button above instead: it works in any browser. On a computer, open this page in <b>Chrome / Edge</b> and tap <b>Or install from the browser</b> again.';
          }
          installHint.hidden = false;
        }
        if (inAppNow()) markInstalled();
        window.addEventListener('beforeinstallprompt', function (e) {
          e.preventDefault();
          deferredPrompt = e;
          if (installHint) installHint.hidden = true;
        });
        window.addEventListener('appinstalled', function () {
          deferredPrompt = null;
          markInstalled();
        });
        installBtns.forEach(function (btn) {
          btn.addEventListener('click', function () {
            if (deferredPrompt) {
              var p = deferredPrompt;
              deferredPrompt = null;
              p.prompt();
              p.userChoice.then(function (choice) {
                if (choice && choice.outcome === 'accepted') markInstalled();
              });
            } else if (inAppNow()) {
              markInstalled();
            } else {
              showHint();
            }
          });
        });

        /* App navigation: keep the sticky player tucked exactly under
           the header, give anchor jumps the right offset (header +
           the playing player), and light up the current section in
           the bottom tab bar / top nav as the visitor scrolls. */
        var siteHeader = document.querySelector('header.site');
        function syncSticky() {
          if (!siteHeader) return;
          var h = siteHeader.offsetHeight;
          document.documentElement.style.setProperty('--stickyTop', h + 'px');
          var extra = topPlayer && topPlayer.classList.contains('is-playing') && window.innerWidth <= 1024 ? topPlayer.offsetHeight : 0;
          document.documentElement.style.setProperty('--sectionTop', (h + extra + 12) + 'px');
        }
        syncSticky();
        window.addEventListener('resize', syncSticky);
        window.addEventListener('load', syncSticky);

        var spySections = [
          { key: 'watch', el: document.getElementById('watch') },
          { key: 'channels', el: document.getElementById('channels') },
          { key: 'matches', el: document.getElementById('matches') },
          { key: 'countries', el: document.getElementById('countries') },
          { key: 'table', el: document.getElementById('table') },
          { key: 'table', el: document.getElementById('wtc') }
        ].filter(function (s) { return !!s.el; });
        var spyLinks = Array.prototype.slice.call(document.querySelectorAll('.tabbar a, nav.main a'));
        function spyHref(key) {
          return key === 'watch' ? '#watch' : key === 'table' ? '#table' : '#' + key;
        }
        var spyTicking = false;
        function updateSpy() {
          var y = window.scrollY + (siteHeader ? siteHeader.offsetHeight : 64) + 60;
          var current = 'watch';
          spySections.forEach(function (s) {
            if (s.el.getBoundingClientRect().top + window.scrollY <= y) current = s.key;
          });
          spyLinks.forEach(function (a) {
            a.classList.toggle('spy-active', a.getAttribute('href') === spyHref(current));
          });
        }
        window.addEventListener('scroll', function () {
          if (!spyTicking) {
            spyTicking = true;
            window.requestAnimationFrame(function () { updateSpy(); spyTicking = false; });
          }
        }, { passive: true });
        updateSpy();
      })();
    