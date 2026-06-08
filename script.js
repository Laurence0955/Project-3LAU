/* ==========================================
   1.0 WEBSITE ARCHIVE PAGE (WebArchive)
   ========================================== */

const GOOGLE_SHEET_API_URL = "https://script.google.com/macros/s/AKfycbwYkvVsQhwlkIJI9yaJLsERH-9FGtkD73tzFoCZa7dMt54Int8Cla-wXgItzajyBrXqsg/exec"

// DOM Anchors hooked to the WebArchive system classes
const webArchiveDataBoard = document.getElementById('DynamicDataBoard');
const webArchiveFilterToggleBtn = document.querySelector('.WebArchivePage_FilterToggleBtn');
const webArchiveFilterSettingsBox = document.querySelector('.WebArchivePage_FilterSettingsBox');
const webArchiveFilterCancelBtn = document.querySelector('.WebArchivePage_ActionCancel');
const webArchiveFilterApplyBtn = document.querySelector('.WebArchivePage_ActionApply');
const webArchiveSearchInput = document.querySelector('.WebArchivePage_SearchInput');
const webArchiveModalOverlay = document.querySelector('.WebArchivePage_ModalOverlay');
const webArchiveModalCloseBtn = document.querySelector('.WebArchivePage_ModalCloseBtn');

// New DOM Anchors for the Form and Interactive Management Panels
const webArchiveAddCardBtn = document.querySelector('.WebArchivePage_AddCardBtn');
const webArchiveModalEditBtn = document.querySelector('.WebArchivePage_ModalEditBtn');
const webArchiveFormOverlay = document.querySelector('.WebArchivePage_FormOverlay');
const webArchiveFormCloseBtn = document.querySelector('.WebArchivePage_FormCloseBtn');
const webArchiveHubForm = document.getElementById('WebArchiveHubForm');

// Specific Form Input Fields Anchors
const formCardId = document.getElementById('Form_CardId');
const formMainCatSelect = document.getElementById('Form_MainCategorySelect');
const formMainCatNew = document.getElementById('Form_MainCategoryNew');
const formSubCatSelect = document.getElementById('Form_SubCategorySelect');
const formSubCatNew = document.getElementById('Form_SubCategoryNew');
const formName = document.getElementById('Form_Name');
const formIcon = document.getElementById('Form_Icon');
const formLink = document.getElementById('Form_Link');
const formDescription = document.getElementById('Form_Description');
const formDetailDesc = document.getElementById('Form_DetailDescription');
const formPros = document.getElementById('Form_Pros');
const formCons = document.getElementById('Form_Cons');

let webArchiveCardsList = [];
let globalDatabaseRecords = []; // Global anchor cache for tracking edits dynamically

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
    webArchiveDataBoard.innerHTML = `<p style="text-align:center; opacity:0.6; font-style:italic; margin-top:4rem;">L.A.U. Loading Library...</p>`;

    fetch(GOOGLE_SHEET_API_URL)
        .then(response => response.json())
        .then(websiteList => {
            globalDatabaseRecords = websiteList; // Save copy to memory for form processing
            
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
            populateFormDropdownStructures(websiteList); // Setup modern dynamic selection boxes
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
            
            // Set attributes including our barcode tracker ID
            card.setAttribute('data-id', item.id || "");
            card.setAttribute('data-icon', item.icon || "🌐");
            card.setAttribute('data-name', item.name);
            card.setAttribute('data-link', item.link);
            card.setAttribute('data-desc', item.description || "");
            card.setAttribute('data-detaildesc', item.detaildescription || "");
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

                // Bind the sheet ID directly onto the viewing modal edit button frame
                const cardId = targetCard.getAttribute('data-id');
                webArchiveModalEditBtn.setAttribute('data-target-id', cardId);

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
    }
}

/* ==========================================
   1.6 ENTRY FORM INTERFACE CONTROLS
   ========================================== */
if (webArchiveAddCardBtn) {
    webArchiveAddCardBtn.onclick = () => {
        // Reset form layout for clean additions
        webArchiveHubForm.reset();
        formCardId.value = "";
        document.querySelector('.WebArchivePage_FormTitle').textContent = "Add New Resource";
        
        // Ensure manual text fields are hidden on open
        formMainCatNew.style.display = 'none';
        formSubCatNew.style.display = 'none';
        formMainCatSelect.required = true;
        formSubCatSelect.required = true;
        
        // Trigger select cascade initialization
        formMainCatSelect.value = formMainCatSelect.options[0].value;
        formMainCatSelect.dispatchEvent(new Event('change'));
        
        webArchiveFormOverlay.style.display = 'flex';
    };
}

if (webArchiveModalEditBtn) {
    webArchiveModalEditBtn.onclick = () => {
        const targetId = webArchiveModalEditBtn.getAttribute('data-target-id');
        const record = globalDatabaseRecords.find(item => String(item.id) === String(targetId));
        
        if (!record) return;

        // Configure frame titles and load inputs
        document.querySelector('.WebArchivePage_FormTitle').textContent = "Edit Existing Card";
        formCardId.value = record.id;
        formName.value = record.name || "";
        formIcon.value = record.icon || "";
        formLink.value = record.link || "";
        formDescription.value = record.description || "";
        formDetailDesc.value = record.detaildescription || "";
        formPros.value = record.pros || "";
        formCons.value = record.cons || "";

        // Synchronize drop-down assignments
        formMainCatSelect.value = record.mainCategory;
        formMainCatSelect.dispatchEvent(new Event('change'));
        formSubCatSelect.value = record.subCategory;

        // Hide plain text modifications panels
        formMainCatNew.style.display = 'none';
        formSubCatNew.style.display = 'none';

        // Close display window and trigger editor layout view
        webArchiveModalOverlay.style.display = 'none';
        webArchiveFormOverlay.style.display = 'flex';
    };
}

if (webArchiveFormCloseBtn) {
    webArchiveFormCloseBtn.onclick = () => { webArchiveFormOverlay.style.display = 'none'; };
}

// Global dismiss handling logic rules
window.onclick = (e) => {
    if (e.target === webArchiveModalOverlay) webArchiveModalOverlay.style.display = 'none';
    if (e.target === webArchiveFormOverlay) webArchiveFormOverlay.style.display = 'none';
};

/* ==========================================
   1.7 DYNAMIC FIELD CASCADE CONTROLS
   ========================================= */
function populateFormDropdownStructures(data) {
    const categoryTree = {};
    
    data.forEach(item => {
        if (!item.mainCategory || !item.subCategory) return;
        if (!categoryTree[item.mainCategory]) {
            categoryTree[item.mainCategory] = new Set();
        }
        categoryTree[item.mainCategory].add(item.subCategory);
    });

    // Populate Main Category box list options
    formMainCatSelect.innerHTML = `<option value="" disabled selected>Select a Main Category...</option>`;
    Object.keys(categoryTree).sort().forEach(main => {
        formMainCatSelect.innerHTML += `<option value="${main}">${main}</option>`;
    });
    formMainCatSelect.innerHTML += `<option value="__NEW_MAIN__">+ Create New Main Category...</option>`;

    // Set listener to update Subcategories when Main Category changes
    formMainCatSelect.onchange = () => {
        const chosenMain = formMainCatSelect.value;
        
        if (chosenMain === "__NEW_MAIN__") {
            formMainCatNew.style.display = 'block';
            formMainCatNew.required = true;
            
            // Lock and shift sub category into text input fallback execution mode
            formSubCatSelect.innerHTML = `<option value="__NEW_SUB__">+ Create New Sub Category...</option>`;
            formSubCatSelect.value = "__NEW_SUB__";
            formSubCatSelect.dispatchEvent(new Event('change'));
        } else {
            formMainCatNew.style.display = 'none';
            formMainCatNew.required = false;
            formMainCatNew.value = "";

            formSubCatSelect.innerHTML = `<option value="" disabled selected>Select a Sub Category...</option>`;
            if (categoryTree[chosenMain]) {
                Array.from(categoryTree[chosenMain]).sort().forEach(sub => {
                    formSubCatSelect.innerHTML += `<option value="${sub}">${sub}</option>`;
                });
            }
            formSubCatSelect.innerHTML += `<option value="__NEW_SUB__">+ Create New Sub Category...</option>`;
            formSubCatSelect.disabled = false;
        }
    };

    // Sub selection configuration monitoring checks
    formSubCatSelect.onchange = () => {
        if (formSubCatSelect.value === "__NEW_SUB__") {
            formSubCatNew.style.display = 'block';
            formSubCatNew.required = true;
        } else {
            formSubCatNew.style.display = 'none';
            formSubCatNew.required = false;
            formSubCatNew.value = "";
        }
    };
}

/* ==========================================
   1.8 ASYNC DATA SUBMISSION PIPELINE
   ========================================== */
if (webArchiveHubForm) {
    webArchiveHubForm.onsubmit = (e) => {
        e.preventDefault(); // Lock native screen reload parameters

        const submitBtn = webArchiveHubForm.querySelector('.WebArchivePage_FormSubmitBtn');
        submitBtn.disabled = true;
        submitBtn.textContent = "Processing Stream...";

        // Extract value mappings or swap values to custom text inputs if created new
        const finalMainCategory = formMainCatSelect.value === "__NEW_MAIN__" ? formMainCatNew.value.trim() : formMainCatSelect.value;
        const finalSubCategory = formSubCatSelect.value === "__NEW_SUB__" ? formSubCatNew.value.trim() : formSubCatSelect.value;

        // Build transmission layout packet payload block
        const submissionPayload = {
            id: formCardId.value ? parseInt(formCardId.value) : null,
            mainCategory: finalMainCategory,
            subCategory: finalSubCategory,
            name: formName.value.trim(),
            icon: formIcon.value.trim(),
            link: formLink.value.trim(),
            description: formDescription.value.trim(),
            detaildescription: formDetailDesc.value.trim(),
            pros: formPros.value.trim(),
            cons: formCons.value.trim()
        };

        // Fire asynchronous transaction stream to Google Cloud Apps Script Core Engine
        fetch(GOOGLE_SHEET_API_URL, {
            method: 'POST',
            body: JSON.stringify(submissionPayload)
        })
        .then(res => res.json())
        .then(response => {
            if (response.status === "success") {
                alert(response.message);
                webArchiveFormOverlay.style.display = 'none';
                window.location.reload(); // Synchronize layout views
            } else {
                alert("Matrix Overload: " + response.message);
                submitBtn.disabled = false;
                submitBtn.textContent = "Save to Hub";
            }
        })
        .catch(err => {
            console.error("Transmission Failure Error:", err);
            alert("Connection lost to transmission stream cloud engine.");
            submitBtn.disabled = false;
            submitBtn.textContent = "Save to Hub";
        });
    };
}