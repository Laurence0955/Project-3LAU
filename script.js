/* ==========================================
   1.0 WEBSITE ARCHIVE PAGE (WebArchive)
   ========================================== */

const GOOGLE_SHEET_API_URL = "https://script.google.com/macros/s/AKfycbzKoXoa7eYTeiTou_J1BlgzIDFlrxEEURoRsoHQo4njTMKNakywr8zIesKx16iSC8tj9Q/exec";

// DOM Anchors hooked to the WebArchive system classes
const webArchiveDataBoard = document.getElementById('DynamicDataBoard');
const webArchiveFilterToggleBtn = document.querySelector('.WebArchivePage_FilterToggleBtn');
const webArchiveFilterSettingsBox = document.querySelector('.WebArchivePage_FilterSettingsBox');
const webArchiveFilterCancelBtn = document.querySelector('.WebArchivePage_ActionCancel');
const webArchiveFilterApplyBtn = document.querySelector('.WebArchivePage_ActionApply');
const webArchiveSearchInput = document.querySelector('.WebArchivePage_SearchInput');
const webArchiveModalOverlay = document.querySelector('.WebArchivePage_ModalOverlay');
const webArchiveModalCloseBtn = document.querySelector('.WebArchivePage_ModalCloseBtn');

let webArchiveCardsList = [];

/* ------------------------------------------
   1.1 VISUAL SELECTION BOX CONTROLS
   ------------------------------------------ */
if (webArchiveFilterToggleBtn) {
    webArchiveFilterToggleBtn.onclick = () => {
        const isVisible = webArchiveFilterSettingsBox.style.display === 'block';
        webArchiveFilterSettingsBox.style.display = isVisible ? 'none' : 'block';
    };
    webArchiveFilterCancelBtn.onclick = () => { webArchiveFilterSettingsBox.style.display = 'none'; };
}

if (webArchiveFilterApplyBtn) {
    webArchiveFilterApplyBtn.onclick = () => {
        const mainCheckboxes = document.querySelectorAll('#MainCategoryFilters .MainCatCheckbox');
        const subCheckboxes = document.querySelectorAll('#SubCategoryFilters .SubCatCheckbox');
        
        const activeMains = Array.from(mainCheckboxes).filter(cb => cb.checked).map(cb => cb.value);
        const activeScopedSubs = Array.from(subCheckboxes).filter(cb => cb.checked).map(cb => cb.value);
        
        const categoryLanes = document.querySelectorAll('.WebArchivePage_CategoryLane');
        
        categoryLanes.forEach(lane => {
            const laneCategory = lane.getAttribute('data-category');
            const laneCards = lane.querySelectorAll('.WebArchivePage_Card');
            let visibleCardsInLane = 0;
            
            laneCards.forEach(card => {
                const cardSub = card.getAttribute('data-subcategory');
                const currentCardScope = `${laneCategory}::${cardSub}`;
                
                if (activeMains.includes(laneCategory) && activeScopedSubs.includes(currentCardScope)) {
                    card.style.display = 'flex';
                    visibleCardsInLane++;
                } else {
                    card.style.display = 'none';
                }
            });
            
            lane.style.display = (activeMains.includes(laneCategory) && visibleCardsInLane > 0) ? 'block' : 'none';
        });
        webArchiveFilterSettingsBox.style.display = 'none';
    };
}

/* ------------------------------------------
   1.2 SPREADSHEET BACKEND STREAM COUPLING
   ------------------------------------------ */
if (webArchiveDataBoard) {
    webArchiveDataBoard.innerHTML = `<p style="text-align:center; opacity:0.6; font-style:italic; margin-top:4rem;">Loading family database entries...</p>`;

    fetch(GOOGLE_SHEET_API_URL)
        .then(response => response.json())
        .then(websiteList => {
            
            // Core Alphabetical Sorting Matrix
            websiteList.sort((a, b) => {
                let mainCompare = String(a.mainCategory).localeCompare(String(b.mainCategory), undefined, { sensitivity: 'base' });
                if (mainCompare !== 0) return mainCompare;

                let subCompare = String(a.subCategory).localeCompare(String(b.subCategory), undefined, { sensitivity: 'base' });
                if (subCompare !== 0) return subCompare;

                return String(a.name).localeCompare(String(b.name), undefined, { sensitivity: 'base' });
            });

            buildHierarchicalFilters(websiteList); 
            buildWebArchiveCards(websiteList); 
            setupInteractiveListeners();     
        })
        .catch(err => {
            console.error("Connection Error:", err);
            webArchiveDataBoard.innerHTML = `<p style="color:red; text-align:center;">Failed to load data. Refresh your browser window.</p>`;
        });
}

/* ------------------------------------------
   1.3 NESTED DRILL-DOWN FILTER GENERATOR
   ------------------------------------------ */
function buildHierarchicalFilters(data) {
    const mainContainer = document.getElementById('MainCategoryFilters');
    const subContainer = document.getElementById('SubCategoryFilters');
    
    if (!mainContainer || !subContainer) return;

    mainContainer.innerHTML = "";
    subContainer.innerHTML = `<p id="SubCategoryPlaceholder">Click a main category arrow to inspect sub options...</p>`;

    const categoryTree = {};
    data.forEach(item => {
        if (!item.mainCategory || !item.subCategory) return;
        if (!categoryTree[item.mainCategory]) {
            categoryTree[item.mainCategory] = new Set();
        }
        categoryTree[item.mainCategory].add(item.subCategory);
    });

    const sortedMains = Object.keys(categoryTree).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

    sortedMains.forEach((mainCat, index) => {
        const rowId = `subPanel_${index}`;
        
        const rowDiv = document.createElement('div');
        rowDiv.className = 'WebArchivePage_MainCatRow';
        rowDiv.innerHTML = `
            <div class="WebArchivePage_MainCatLeft">
                <input type="checkbox" checked value="${mainCat}" class="MainCatCheckbox" id="chkMain_${index}">
                <label for="chkMain_${index}"><strong>${mainCat}</strong></label>
            </div>
            <span class="WebArchivePage_ToggleArrow" data-target="${rowId}">▸</span>
        `;
        
        mainContainer.appendChild(rowDiv);

        const subPanel = document.createElement('div');
        subPanel.className = 'WebArchivePage_SubPanel';
        subPanel.id = rowId;
        
        const sortedSubs = Array.from(categoryTree[mainCat]).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
        
        sortedSubs.forEach(subCat => {
            const label = document.createElement('label');
            const scopedValue = `${mainCat}::${subCat}`;
            label.innerHTML = `<input type="checkbox" checked value="${scopedValue}" class="SubCatCheckbox"> ${subCat}`;
            subPanel.appendChild(label);
        });
        
        subContainer.appendChild(subPanel);

        rowDiv.onclick = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'LABEL') return;

            const allPanels = document.querySelectorAll('.WebArchivePage_SubPanel');
            const allArrows = document.querySelectorAll('.WebArchivePage_ToggleArrow');
            const targetPanel = document.getElementById(rowId);
            const isCurrentlyOpen = targetPanel.style.display === 'block';

            allPanels.forEach(p => p.style.display = 'none');
            allArrows.forEach(a => a.textContent = '▸');

            const placeholder = document.getElementById('SubCategoryPlaceholder');

            if (!isCurrentlyOpen) {
                targetPanel.style.display = 'block';
                rowDiv.querySelector('.WebArchivePage_ToggleArrow').textContent = '▾';
                if (placeholder) placeholder.style.display = 'none';
            } else {
                if (placeholder) placeholder.style.display = 'block';
            }
        };
    });
}

/* ------------------------------------------
   1.4 LINK CARD BUILD LOOP
   ------------------------------------------ */
function buildWebArchiveCards(data) {
    const categories = [...new Set(data.map(item => item.mainCategory).filter(Boolean))];
    webArchiveDataBoard.innerHTML = ""; 

    categories.forEach(category => {
        const lane = document.createElement('div');
        lane.className = 'WebArchivePage_CategoryLane';
        lane.setAttribute('data-category', category);
        lane.innerHTML = `
            <h2>${category}</h2>
            <div class="WebArchivePage_DeckSlider"></div>
        `;

        const slider = lane.querySelector('.WebArchivePage_DeckSlider');
        const itemsInGroup = data.filter(item => item.mainCategory === category);

        itemsInGroup.forEach(item => {
            const card = document.createElement('div');
            card.className = 'WebArchivePage_Card';
            card.setAttribute('data-subcategory', item.subCategory);
            
            card.setAttribute('data-icon', item.icon || "🌐");
            card.setAttribute('data-name', item.name);
            card.setAttribute('data-link', item.link);
            
            const deepDesc = item.detaildescription || item.DetailDescriptio || item.Detaildescription || "";
            card.setAttribute('data-detaildesc', deepDesc);
            
            card.setAttribute('data-pros', item.pros || "");
            card.setAttribute('data-cons', item.cons || "");

            let iconHtml = `🌐`;
            if (item.icon) {
                const iconText = String(item.icon).trim();
                if (iconText.startsWith('http')) {
                    iconHtml = `<img src="${iconText}" alt="${item.name} logo" style="width:28px; height:28px; object-fit:contain; border-radius:4px;">`;
                } else {
                    iconHtml = iconText;
                }
            }

            card.innerHTML = `
                <div class="WebArchivePage_CardHeader">
                    <span class="WebArchivePage_CardIcon">${iconHtml}</span>
                    <span class="WebArchivePage_CardSubTag">${item.subCategory}</span>
                </div>
                <a href="${item.link}" target="_blank" class="WebArchivePage_CardTitleLink">${item.name}</a>
                <div class="WebArchivePage_CardDesc">${item.description}</div>
            `;
            slider.appendChild(card);
        });

        webArchiveDataBoard.appendChild(lane);
    });

    webArchiveCardsList = document.querySelectorAll('.WebArchivePage_Card');
}

/* ------------------------------------------
   1.5 INTERACTIVE REAL-TIME EVENT HANDLERS
   ------------------------------------------ */
function setupInteractiveListeners() {
    if (webArchiveSearchInput) {
        webArchiveSearchInput.onkeyup = (e) => {
            const query = e.target.value.toLowerCase().trim();
            const categoryLanes = document.querySelectorAll('.WebArchivePage_CategoryLane');
            
            categoryLanes.forEach(lane => {
                const laneCategory = lane.getAttribute('data-category').toLowerCase();
                const laneCards = lane.querySelectorAll('.WebArchivePage_Card');
                let visibleCardsInLane = 0;
                
                laneCards.forEach(card => {
                    const cardTitle = card.querySelector('.WebArchivePage_CardTitleLink').textContent.toLowerCase();
                    const cardSub = card.getAttribute('data-subcategory').toLowerCase();
                    
                    if (laneCategory.includes(query) || cardSub.includes(query) || cardTitle.includes(query)) {
                        card.style.display = 'flex';
                        visibleCardsInLane++;
                    } else {
                        card.style.display = 'none';
                    }
                });
                lane.style.display = (visibleCardsInLane > 0) ? 'block' : 'none';
            });
        };
    }

    if (webArchiveCardsList.length > 0) {
        webArchiveCardsList.forEach(card => {
            card.onclick = (e) => {
                if (e.target.classList.contains('WebArchivePage_CardTitleLink')) return;
                
                const targetCard = e.target.closest('.WebArchivePage_Card');
                if (!targetCard) return;

                const name = targetCard.getAttribute('data-name');
                const link = targetCard.getAttribute('data-link');
                const subtag = targetCard.getAttribute('data-subcategory');
                const detailDesc = targetCard.getAttribute('data-detaildesc');
                const pros = targetCard.getAttribute('data-pros') ? targetCard.getAttribute('data-pros').split(',') : [];
                const cons = targetCard.getAttribute('data-cons') ? targetCard.getAttribute('data-cons').split(',') : [];
                
                webArchiveModalOverlay.querySelector('.WebArchivePage_ModalIcon').innerHTML = targetCard.querySelector('.WebArchivePage_CardIcon').innerHTML;
                
                const titleLink = webArchiveModalOverlay.querySelector('.WebArchivePage_ModalTitleLink');
                titleLink.textContent = name;
                titleLink.href = link;
                
                webArchiveModalOverlay.querySelector('.WebArchivePage_ModalSubTag').textContent = subtag;
                webArchiveModalOverlay.querySelector('.WebArchivePage_ModalDeepDesc').textContent = detailDesc;
                
                // Fixed target selectors for tradeoffs box alignment synchronization
                const prosList = webArchiveModalOverlay.querySelector('.WebArchivePage_TradeOffColumn:nth-child(1) ul');
                prosList.innerHTML = pros.map(pro => `<li>${pro.trim()}</li>`).join('');
                
                const consList = webArchiveModalOverlay.querySelector('.WebArchivePage_TradeOffColumn:nth-child(2) ul');
                consList.innerHTML = cons.map(con => `<li>${con.trim()}</li>`).join('');
                
                webArchiveModalOverlay.style.display = 'flex';
            };
        });
    }

    if (webArchiveModalCloseBtn) {
        webArchiveModalCloseBtn.onclick = () => { webArchiveModalOverlay.style.display = 'none'; };
        window.onclick = (e) => { if (e.target === webArchiveModalOverlay) webArchiveModalOverlay.style.display = 'none'; };
    }
}