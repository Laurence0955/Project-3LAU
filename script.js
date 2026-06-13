/**
 * L.A.U. Core Application Controller
 * Architecture: Page-Routed Module Pattern (Clean Separation of Concerns)
 */

const CONFIG = {
    API_URL: "https://script.google.com/macros/s/AKfycbwYkvVsQhwlkIJI9yaJLsERH-9FGtkD73tzFoCZa7dMt54Int8Cla-wXgItzajyBrXqsg/exec",
    DEFAULT_SIZE: 60
};

// Global Runtime State Caches
const AppState = {
    archiveRecords: [],
    assetRecords: [],
    activeAssetFilter: "ALL",
    assetSearchQuery: ""
};

// ==========================================================================
// SYSTEM ROUTER BOOTSTRAPPING ENGINE
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
    const isArchivePage = document.getElementById('DynamicDataBoard') !== null;
    const isAssetPage = document.querySelector('.AssetRegistryPage_ColumnsLayout') !== null || document.getElementById('SpatialFloorplanCanvas') !== null;

    if (isArchivePage) {
        console.log("L.A.U. Core: Initializing Module [Website Archive Router]");
        ArchiveModule.init();
    } else if (isAssetPage) {
        console.log("L.A.U. Core: Initializing Module [Asset Registry Router]");
        AssetModule.init();
    } else {
        console.warn("L.A.U. Core: Execution Environment Unknown. Routing Suspended.");
    }
});

// ==========================================================================
// MODULE A: WEBSITE ARCHIVE ENGINE (archive.html)
// ==========================================================================
const ArchiveModule = {
    DOM: {},

    init() {
        this.cacheElements();
        this.bindEvents();
        this.fetchData();
    },

    cacheElements() {
        this.DOM = {
            board: document.getElementById('DynamicDataBoard'),
            filterToggle: document.querySelector('.WebArchivePage_FilterToggleBtn'),
            filterBox: document.querySelector('.WebArchivePage_FilterSettingsBox'),
            filterCancel: document.querySelector('.WebArchivePage_ActionCancel'),
            filterApply: document.querySelector('.WebArchivePage_ActionApply'),
            searchInput: document.querySelector('.WebArchivePage_SearchInput'),
            modalOverlay: document.querySelector('.WebArchivePage_ModalOverlay'),
            modalClose: document.querySelector('.WebArchivePage_ModalCloseBtn'),
            modalEditBtn: document.querySelector('.WebArchivePage_ModalEditBtn'),
            addCardBtn: document.querySelector('.WebArchivePage_AddCardBtn'),
            formOverlay: document.querySelector('.WebArchivePage_FormOverlay'),
            formClose: document.querySelector('.WebArchivePage_FormCloseBtn'),
            hubForm: document.getElementById('WebArchiveHubForm'),
            
            // Form Target Inputs
            formId: document.getElementById('Form_CardId'),
            formMainSelect: document.getElementById('Form_MainCategorySelect'),
            formMainNew: document.getElementById('Form_MainCategoryNew'),
            formSubSelect: document.getElementById('Form_SubCategorySelect'),
            formSubNew: document.getElementById('Form_SubCategoryNew'),
            formName: document.getElementById('Form_Name'),
            formIcon: document.getElementById('Form_Icon'),
            formLink: document.getElementById('Form_Link'),
            formDesc: document.getElementById('Form_Description'),
            formDetailDesc: document.getElementById('Form_DetailDescription'),
            formPros: document.getElementById('Form_Pros'),
            formCons: document.getElementById('Form_Cons')
        };
    },

    bindEvents() {
        if (this.DOM.filterToggle && this.DOM.filterBox) {
            this.DOM.filterToggle.onclick = () => {
                const visible = this.DOM.filterBox.style.display === 'block';
                this.DOM.filterBox.style.display = visible ? 'none' : 'block';
            };
        }
        if (this.DOM.filterCancel && this.DOM.filterBox) {
            this.DOM.filterCancel.onclick = () => this.DOM.filterBox.style.display = 'none';
        }
        if (this.DOM.filterApply) {
            this.DOM.filterApply.onclick = () => this.applyActiveFilterSettings();
        }
        if (this.DOM.searchInput) {
            this.DOM.searchInput.onkeyup = (e) => this.handleLiveSearch(e.target.value.toLowerCase().trim());
        }
        if (this.DOM.board) {
            this.DOM.board.addEventListener('click', (e) => this.handleGridCardClick(e));
        }
        if (this.DOM.modalClose && this.DOM.modalOverlay) {
            this.DOM.modalClose.onclick = () => this.DOM.modalOverlay.style.display = 'none';
        }
        if (this.DOM.addCardBtn) {
            this.DOM.addCardBtn.onclick = () => this.openFormWindowForCreation();
        }
        if (this.DOM.modalEditBtn) {
            this.DOM.modalEditBtn.onclick = () => this.openFormWindowForModification();
        }
        if (this.DOM.formClose && this.DOM.formOverlay) {
            this.DOM.formClose.onclick = () => this.DOM.formOverlay.style.display = 'none';
        }
        if (this.DOM.hubForm) {
            this.DOM.hubForm.onsubmit = (e) => this.handleFormSubmissionPipeline(e);
        }

        window.onclick = (e) => {
            if (e.target === this.DOM.modalOverlay) this.DOM.modalOverlay.style.display = 'none';
            if (e.target === this.DOM.formOverlay) this.DOM.formOverlay.style.display = 'none';
        };
    },

    fetchData() {
        this.DOM.board.innerHTML = `<p class="lau-system-placeholder italic centered">L.A.U. Loading Library...</p>`;

        fetch(`${CONFIG.API_URL}?target=web_archive`)
            .then(res => res.json())
            .then(data => {
                AppState.archiveRecords = data;
                this.sortAlphabetically(AppState.archiveRecords);
                this.buildHierarchicalFilterPanel(AppState.archiveRecords);
                this.renderArchiveLanes(AppState.archiveRecords);
                this.setupCascadingFormDropdowns(AppState.archiveRecords);
            })
            .catch(err => {
                console.error("Database Connection Failure [Web Archive]:", err);
                this.DOM.board.innerHTML = `<p class="lau-error-alert text-center">Failed to load resource data rows. Refresh browser viewport.</p>`;
            });
    },

    sortAlphabetically(list) {
        list.sort((a, b) => {
            let mComp = String(a.mainCategory || '').localeCompare(String(b.mainCategory || ''), undefined, { sensitivity: 'base' });
            if (mComp !== 0) return mComp;
            let sComp = String(a.subCategory || '').localeCompare(String(b.subCategory || ''), undefined, { sensitivity: 'base' });
            if (sComp !== 0) return sComp;
            return String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' });
        });
    },

    buildHierarchicalFilterPanel(data) {
        const mainBox = document.getElementById('MainCategoryFilters');
        const subBox = document.getElementById('SubCategoryFilters');
        if (!mainBox || !subBox) return;

        mainBox.innerHTML = "";
        subBox.innerHTML = `<p id="SubCategoryPlaceholder" class="placeholder-text text-sm">Click a category arrow row to inspect variants...</p>`;

        const tree = {};
        data.forEach(item => {
            if (!item.mainCategory || !item.subCategory) return;
            if (!tree[item.mainCategory]) tree[item.mainCategory] = new Set();
            tree[item.mainCategory].add(item.subCategory);
        });

        Object.keys(tree).sort().forEach((mainCat, idx) => {
            const rowId = `subPanel_${idx}`;
            
            const row = document.createElement('div');
            row.className = 'WebArchivePage_MainCatRow';
            row.innerHTML = `
                <div class="WebArchivePage_MainCatLeft">
                    <input type="checkbox" checked value="${mainCat}" class="MainCatCheckbox" id="chkMain_${idx}">
                    <label for="chkMain_${idx}"><strong>${mainCat}</strong></label>
                </div>
                <span class="WebArchivePage_ToggleArrow">▸</span>
            `;
            mainBox.appendChild(row);

            const panel = document.createElement('div');
            panel.className = 'WebArchivePage_SubPanel';
            panel.id = rowId;
            panel.style.display = 'none';

            Array.from(tree[mainCat]).sort().forEach(subCat => {
                const label = document.createElement('label');
                label.className = 'checkbox-label block';
                label.innerHTML = `<input type="checkbox" checked value="${mainCat}::${subCat}" class="SubCatCheckbox"> ${subCat}`;
                panel.appendChild(label);
            });
            subBox.appendChild(panel);

            row.onclick = (e) => {
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'LABEL') return;
                const active = panel.style.display === 'block';
                document.querySelectorAll('.WebArchivePage_SubPanel').forEach(p => p.style.display = 'none');
                document.querySelectorAll('.WebArchivePage_ToggleArrow').forEach(a => a.textContent = '▸');
                
                const ph = document.getElementById('SubCategoryPlaceholder');
                if (!active) {
                    panel.style.display = 'block';
                    row.querySelector('.WebArchivePage_ToggleArrow').textContent = '▼';
                    if (ph) ph.style.display = 'none';
                } else {
                    if (ph) ph.style.display = 'block';
                }
            };
        });
    },

    renderArchiveLanes(data) {
        if (!this.DOM.board) return;
        this.DOM.board.innerHTML = "";

        const categories = [...new Set(data.map(i => i.mainCategory).filter(Boolean))];

        categories.forEach(category => {
            const lane = document.createElement('div');
            lane.className = 'WebArchivePage_CategoryLane';
            lane.setAttribute('data-category', category);
            lane.innerHTML = `<h2>${category}</h2><div class="WebArchivePage_DeckSlider"></div>`;

            const slider = lane.querySelector('.WebArchivePage_DeckSlider');
            
            data.filter(i => i.mainCategory === category).forEach(item => {
                const card = document.createElement('div');
                card.className = 'WebArchivePage_Card';
                this.assignCardDatasetAttributes(card, item);

                let iconMarkup = `🌐`;
                if (item.icon && String(item.icon).trim().startsWith('http')) {
                    iconMarkup = `<img src="${item.icon.trim()}" alt="Resource icon inline" class="card-icon-img">`;
                } else if (item.icon) {
                    iconMarkup = item.icon;
                }

                card.innerHTML = `
                    <div class="WebArchivePage_CardHeader">
                        <span class="WebArchivePage_CardIcon">${iconMarkup}</span>
                        <span class="WebArchivePage_CardSubTag">${item.subCategory || ''}</span>
                    </div>
                    <a href="${item.link || '#'}" target="_blank" class="WebArchivePage_CardTitleLink">${item.name || ''}</a>
                    <div class="WebArchivePage_CardDesc">${item.description || ''}</div>
                `;
                slider.appendChild(card);
            });
            this.DOM.board.appendChild(lane);
        });
    },

    assignCardDatasetAttributes(element, data) {
        element.setAttribute('data-id', data.id || "");
        element.setAttribute('data-subcategory', data.subCategory || '');
        element.setAttribute('data-name', data.name || '');
        element.setAttribute('data-link', data.link || '');
        element.setAttribute('data-desc', data.description || "");
        element.setAttribute('data-detaildesc', data.detaildescription || "");
        element.setAttribute('data-pros', data.pros || "");
        element.setAttribute('data-cons', data.cons || "");
    },

    applyActiveFilterSettings() {
        const activeMains = Array.from(document.querySelectorAll('#MainCategoryFilters .MainCatCheckbox')).filter(c => c.checked).map(c => c.value);
        const activeSubs = Array.from(document.querySelectorAll('#SubCategoryFilters .SubCatCheckbox')).filter(c => c.checked).map(c => c.value);
        
        document.querySelectorAll('.WebArchivePage_CategoryLane').forEach(lane => {
            const laneCat = lane.getAttribute('data-category');
            let visibleCount = 0;
            
            lane.querySelectorAll('.WebArchivePage_Card').forEach(card => {
                const sub = card.getAttribute('data-subcategory');
                const scopeKey = `${laneCat}::${sub}`;
                
                if (activeMains.includes(laneCat) && activeSubs.includes(scopeKey)) {
                    card.style.display = 'flex';
                    visibleCount++;
                } else {
                    card.style.display = 'none';
                }
            });
            lane.style.display = (activeMains.includes(laneCat) && visibleCount > 0) ? 'block' : 'none';
        });
        this.DOM.filterBox.style.display = 'none';
    },

    handleLiveSearch(query) {
        document.querySelectorAll('.WebArchivePage_CategoryLane').forEach(lane => {
            const laneCat = lane.getAttribute('data-category').toLowerCase();
            let visibleCount = 0;
            
            lane.querySelectorAll('.WebArchivePage_Card').forEach(card => {
                const title = card.querySelector('.WebArchivePage_CardTitleLink').textContent.toLowerCase();
                const sub = card.getAttribute('data-subcategory').toLowerCase();
                
                if (laneCat.includes(query) || sub.includes(query) || title.includes(query)) {
                    card.style.display = 'flex';
                    visibleCount++;
                } else {
                    card.style.display = 'none';
                }
            });
            lane.style.display = (visibleCount > 0) ? 'block' : 'none';
        });
    },

    handleGridCardClick(e) {
        const card = e.target.closest('.WebArchivePage_Card');
        if (!card || e.target.classList.contains('WebArchivePage_CardTitleLink')) return;

        const id = card.getAttribute('data-id');
        if (this.DOM.modalEditBtn) this.DOM.modalEditBtn.setAttribute('data-target-id', id);

        if (this.DOM.modalOverlay) {
            this.DOM.modalOverlay.querySelector('.WebArchivePage_ModalIcon').innerHTML = card.querySelector('.WebArchivePage_CardIcon').innerHTML;
            this.DOM.modalOverlay.querySelector('.WebArchivePage_ModalTitleLink').textContent = card.getAttribute('data-name');
            this.DOM.modalOverlay.querySelector('.WebArchivePage_ModalTitleLink').href = card.getAttribute('data-link');
            this.DOM.modalOverlay.querySelector('.WebArchivePage_ModalSubTag').textContent = card.getAttribute('data-subcategory');
            this.DOM.modalOverlay.querySelector('.WebArchivePage_ModalDeepDesc').textContent = card.getAttribute('data-detaildesc');
            
            const pData = card.getAttribute('data-pros') ? card.getAttribute('data-pros').split(',') : [];
            const cData = card.getAttribute('data-cons') ? card.getAttribute('data-cons').split(',') : [];
            
            this.DOM.modalOverlay.querySelector('.WebArchivePage_TradeOffColumn:nth-child(1) ul').innerHTML = pData.filter(Boolean).map(p => `<li>${p.trim()}</li>`).join('');
            this.DOM.modalOverlay.querySelector('.WebArchivePage_TradeOffColumn:nth-child(2) ul').innerHTML = cData.filter(Boolean).map(c => `<li>${c.trim()}</li>`).join('');
            this.DOM.modalOverlay.style.display = 'flex';
        }
    },

    openFormWindowForCreation() {
        if (!this.DOM.hubForm) return;
        this.DOM.hubForm.reset();
        if (this.DOM.formId) this.DOM.formId.value = "";
        
        const title = document.querySelector('.WebArchivePage_FormTitle');
        if (title) title.textContent = "Add New Resource Object Node";
        
        this.toggleCustomFieldsVisibility(false, false);
        if (this.DOM.formMainSelect && this.DOM.formMainSelect.options.length > 0) {
            this.DOM.formMainSelect.selectedIndex = 0;
            this.DOM.formMainSelect.dispatchEvent(new Event('change'));
        }
        if (this.DOM.formOverlay) this.DOM.formOverlay.style.display = 'flex';
    },

    openFormWindowForModification() {
        const id = this.DOM.modalEditBtn.getAttribute('data-target-id');
        const item = AppState.archiveRecords.find(r => String(r.id) === String(id));
        if (!item || !this.DOM.formOverlay) return;

        const title = document.querySelector('.WebArchivePage_FormTitle');
        if (title) title.textContent = "Edit Core Data Matrix Row";
        
        this.DOM.formId.value = item.id || '';
        this.DOM.formName.value = item.name || '';
        this.DOM.formIcon.value = item.icon || '';
        this.DOM.formLink.value = item.link || '';
        this.DOM.formDesc.value = item.description || '';
        this.DOM.formDetailDesc.value = item.detaildescription || '';
        this.DOM.formPros.value = item.pros || '';
        this.DOM.formCons.value = item.cons || '';

        if (this.DOM.formMainSelect) {
            this.DOM.formMainSelect.value = item.mainCategory || '';
            this.DOM.formMainSelect.dispatchEvent(new Event('change'));
        }
        if (this.DOM.formSubSelect) this.DOM.formSubSelect.value = item.subCategory || '';
        
        this.toggleCustomFieldsVisibility(false, false);
        if (this.DOM.modalOverlay) this.DOM.modalOverlay.style.display = 'none';
        this.DOM.formOverlay.style.display = 'flex';
    },

    toggleCustomFieldsVisibility(mainState, subState) {
        if (this.DOM.formMainNew) { this.DOM.formMainNew.style.display = mainState ? 'block' : 'none'; this.DOM.formMainNew.required = mainState; }
        if (this.DOM.formSubNew) { this.DOM.formSubNew.style.display = subState ? 'block' : 'none'; this.DOM.formSubNew.required = subState; }
    },

    setupCascadingFormDropdowns(data) {
        if (!this.DOM.formMainSelect || !this.DOM.formSubSelect) return;
        const tree = {};
        
        data.forEach(i => {
            if (!i.mainCategory || !i.subCategory) return;
            if (!tree[i.mainCategory]) tree[i.mainCategory] = new Set();
            tree[i.mainCategory].add(i.subCategory);
        });

        this.DOM.formMainSelect.innerHTML = `<option value="" disabled selected>Select Main Category Context...</option>`;
        Object.keys(tree).sort().forEach(m => this.DOM.formMainSelect.innerHTML += `<option value="${m}">${m}</option>`);
        this.DOM.formMainSelect.innerHTML += `<option value="__NEW_MAIN__">+ Instantiate New Main Zone...</option>`;

        this.DOM.formMainSelect.onchange = () => {
            const val = this.DOM.formMainSelect.value;
            if (val === "__NEW_MAIN__") {
                this.toggleCustomFieldsVisibility(true, true);
                this.DOM.formSubSelect.innerHTML = `<option value="__NEW_SUB__">+ Instantiate New Sub Zone...</option>`;
                this.DOM.formSubSelect.value = "__NEW_SUB__";
            } else {
                if (this.DOM.formMainNew) { this.DOM.formMainNew.value = ""; this.DOM.formMainNew.style.display = 'none'; this.DOM.formMainNew.required = false; }
                this.DOM.formSubSelect.innerHTML = `<option value="" disabled selected>Select Sub Category Entry...</option>`;
                if (tree[val]) {
                    Array.from(tree[val]).sort().forEach(s => this.DOM.formSubSelect.innerHTML += `<option value="${s}">${s}</option>`);
                }
                this.DOM.formSubSelect.innerHTML += `<option value="__NEW_SUB__">+ Instantiate New Sub Zone...</option>`;
                if (this.DOM.formSubNew) { this.DOM.formSubNew.value = ""; this.DOM.formSubNew.style.display = 'none'; this.DOM.formSubNew.required = false; }
            }
        };

        this.DOM.formSubSelect.onchange = () => {
            const check = this.DOM.formSubSelect.value === "__NEW_SUB__";
            if (this.DOM.formSubNew) { this.DOM.formSubNew.style.display = check ? 'block' : 'none'; this.DOM.formSubNew.required = check; }
        };
    },

    handleFormSubmissionPipeline(e) {
        e.preventDefault();
        const btn = this.DOM.hubForm.querySelector('.WebArchivePage_FormSubmitBtn');
        if (btn) { btn.disabled = true; btn.textContent = "Processing System Matrix Streams..."; }

        const payload = {
            id: this.DOM.formId.value ? parseInt(this.DOM.formId.value) : null,
            mainCategory: this.DOM.formMainSelect.value === "__NEW_MAIN__" ? this.DOM.formMainNew.value.trim() : this.DOM.formMainSelect.value,
            subCategory: this.DOM.formSubSelect.value === "__NEW_SUB__" ? this.DOM.formSubNew.value.trim() : this.DOM.formSubSelect.value,
            name: this.DOM.formName ? this.DOM.formName.value.trim() : "",
            icon: this.DOM.formIcon ? this.DOM.formIcon.value.trim() : "",
            link: this.DOM.formLink ? this.DOM.formLink.value.trim() : "",
            description: this.DOM.formDesc ? this.DOM.formDesc.value.trim() : "",
            detaildescription: this.DOM.formDetailDesc ? this.DOM.formDetailDesc.value.trim() : "",
            pros: this.DOM.formPros ? this.DOM.formPros.value.trim() : "",
            cons: this.DOM.formCons ? this.DOM.formCons.value.trim() : ""
        };

        fetch(CONFIG.API_URL, { method: 'POST', body: JSON.stringify(payload) })
            .then(r => r.json())
            .then(res => {
                if (res.status === "success") { alert(res.message); window.location.reload(); }
                else { alert("Transmission Denied: " + res.message); if (btn) { btn.disabled = false; btn.textContent = "Save to Hub"; } }
            })
            .catch(err => {
                console.error("Post Pipe Failure Node Reset:", err);
                alert("Connection tracking interrupted across transmission stream lines.");
                if (btn) { btn.disabled = false; btn.textContent = "Save to Hub"; }
            });
    }
};

// ==========================================================================
// MODULE B: SPATIAL INVENTORY ASSET ENGINE (asset_registry.html)
// ==========================================================================
const AssetModule = {
    DOM: {},

    init() {
        this.cacheElements();
        this.bindEvents();
        this.fetchData();
    },

    cacheElements() {
        this.DOM = {
            navTree: document.getElementById('AssetLeftNavTree'),
            canvas: document.getElementById('SpatialFloorplanCanvas'),
            inspector: document.getElementById('AssetDetailsInspector'),
            searchField: document.querySelector('.AssetRegistry_SearchInput'),
            filterDropdown: document.querySelector('.AssetRegistry_TypeFilter'),
            
            // Re-targeted directly to match your precise HTML ID string literal hooks
            addAssetBtn: document.getElementById('AssetRegistry_AddBtn'),
            formOverlay: document.getElementById('AssetRegistry_FormOverlay'),
            dataForm: document.getElementById('AssetRegistry_HubForm'),
            btnCloseForm: document.getElementById('AssetRegistry_BtnCloseForm'),
            modalTitle: document.getElementById('AssetRegistry_ModalTitle'),
            
            // Re-targeted internal form input controls
            formId: document.getElementById('AssetRegistry_FormId'),
            formName: document.getElementById('AssetRegistry_FormName'),
            formType: document.getElementById('AssetRegistry_FormType'),
            formDesc: document.getElementById('AssetRegistry_FormDescription')
        };
    },

    bindEvents() {
        // Search Input Component Event Listener Hook
        if (this.DOM.searchField) {
            this.DOM.searchField.onkeyup = () => {
                AppState.assetSearchQuery = this.DOM.searchField.value.toLowerCase().trim();
                this.executeCombinedFilter();
            };
        }

        if (this.DOM.filterDropdown) {
            this.DOM.filterDropdown.onchange = () => {
                AppState.activeAssetFilter = this.DOM.filterDropdown.value;
                this.executeCombinedFilter();
            };
        }
        
        // Asset Creation Card Open Action Hook
        if (this.DOM.addAssetBtn) {
            this.DOM.addAssetBtn.onclick = (e) => {
                e.preventDefault();
                this.handleCreateNewAsset();
            };
        } else {
            console.error("System Core Error: HTML Element target '#AssetRegistry_AddBtn' missing from layout DOM context hierarchy.");
        }

        // Form Control Dismissal Action Hook
        if (this.DOM.btnCloseForm) {
            this.DOM.btnCloseForm.onclick = (e) => {
                e.preventDefault();
                this.handleCloseForm();
            };
        }

        // Data Capture Submission Routing Pipeline Hook
        if (this.DOM.dataForm) {
            this.DOM.dataForm.onsubmit = (e) => {
                this.handleFormSubmit(e);
            };
        }
    },

    fetchData() {
        if (this.DOM.canvas) {
            this.DOM.canvas.innerHTML = `<p class="lau-system-placeholder text-center italic padding-top">L.A.U. Synchronizing Spatial Layout Coordinates...</p>`;
        }

        fetch(`${CONFIG.API_URL}?target=AR_Inv`)
            .then(res => res.json())
            .then(data => {
                if (data.status === "error") throw new Error(data.message);
                AppState.assetRecords = data;
                
                this.renderHierarchicalFolderTree(data);
                this.renderCanvasGridBlocks(data);
            })
            .catch(err => {
                console.error("Asset API Data Fetch Exception:", err);
                if (this.DOM.canvas) {
                    this.DOM.canvas.innerHTML = `<p class="lau-error-alert text-center error-pad">Failed to synchronize spatial network registries.</p>`;
                }
            });
    },

    renderHierarchicalFolderTree(assets) {
        if (!this.DOM.navTree) return;
        this.DOM.navTree.innerHTML = "";

        const categories = [...new Set(assets.map(item => item.type).filter(Boolean))];

        if (categories.length === 0) {
            this.DOM.navTree.innerHTML = `<p class="empty-tree-notice italic text-xs">No active structural environments logged.</p>`;
            return;
        }

        categories.forEach(category => {
            const folderGroup = document.createElement('div');
            folderGroup.className = 'NavTree_FolderGroup';
            
            const folderHeader = document.createElement('div');
            folderHeader.className = 'NavTree_FolderHeader flex items-center justify-between cursor-pointer';
            folderHeader.style.padding = "0.3rem 0";
            folderHeader.innerHTML = `
                <span>📁 <strong>${category}</strong></span>
                <span class="folder-arrow-indicator text-xs transition-transform duration-200" style="display:inline-block; transform:rotate(0deg);">▼</span>
            `;
            
            const childList = document.createElement('ul');
            childList.className = 'NavTree_ChildList list-none pl-4 overflow-hidden';
            childList.style.transition = "max-height 0.25s ease-out";
            childList.style.maxHeight = "500px";

            const children = assets.filter(item => item.type === category);
            children.forEach(item => {
                const li = document.createElement('li');
                li.className = 'NavTree_LinkItem cursor-pointer text-sm border-b border-light-gray';
                li.style.padding = "0.2rem 0";
                li.setAttribute('data-id', item.id);
                li.innerText = item.objectname || `Registry ID ${item.id}`;
                
                li.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.populateDetailsInspector(item);
                    this.highlightActiveMapNode(item.id);
                });
                childList.appendChild(li);
            });

            folderHeader.onclick = () => {
                const isCollapsed = childList.style.maxHeight === "0px";
                childList.style.maxHeight = isCollapsed ? "500px" : "0px";
                folderHeader.querySelector('.folder-arrow-indicator').style.transform = isCollapsed ? "rotate(0deg)" : "rotate(-90deg)";
            };

            folderGroup.appendChild(folderHeader);
            folderGroup.appendChild(childList);
            this.DOM.navTree.appendChild(folderGroup);
        });
    },

    renderCanvasGridBlocks(assets) {
        if (!this.DOM.canvas) return;
        this.DOM.canvas.innerHTML = "";

        assets.forEach(asset => {
            if (asset.pos_x === undefined || asset.pos_y === undefined) return;

            const block = document.createElement('div');
            block.className = 'CanvasSpatialBlock position-absolute cursor-grab flex items-center justify-center';
            block.setAttribute('data-id', asset.id);
            
            block.style.position = "absolute";
            block.style.border = "1px solid #000";
            block.style.display = "flex";
            block.style.alignItems = "center";
            block.style.justifyContent = "center";
            block.style.left = `${asset.pos_x}px`;
            block.style.top = `${asset.pos_y}px`;
            block.style.width = `${asset.width || CONFIG.DEFAULT_SIZE}px`;
            block.style.height = `${asset.height || CONFIG.DEFAULT_SIZE}px`;
            block.innerText = asset.id;

            block.addEventListener('click', () => {
                this.populateDetailsInspector(asset);
                this.highlightActiveMapNode(asset.id);
            });
            this.enableDraggableMechanics(block, asset);

            this.DOM.canvas.appendChild(block);
        });
    },

    enableDraggableMechanics(element, asset) {
        let isDragging = false;
        let startX, startY, initialLeft, initialTop;

        element.addEventListener('mousedown', (e) => {
            isDragging = true;
            element.classList.add('dragging-active');
            
            startX = e.clientX;
            startY = e.clientY;
            initialLeft = parseInt(element.style.left) || 0;
            initialTop = parseInt(element.style.top) || 0;
            
            document.addEventListener('mousemove', processMouseMove);
            document.addEventListener('mouseup', processMouseUp);
            e.preventDefault();
        });

        const processMouseMove = (e) => {
            if (!isDragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            
            const nextX = initialLeft + dx;
            const nextY = initialTop + dy;

            element.style.left = `${nextX}px`;
            element.style.top = `${nextY}px`;
            
            asset.pos_x = nextX;
            asset.pos_y = nextY;
            
            const inspectorId = this.DOM.inspector ? this.DOM.inspector.querySelector('.data-id') : null;
            if (inspectorId && inspectorId.textContent === String(asset.id)) {
                const xDisplay = this.DOM.inspector.querySelector('.data-x');
                const yDisplay = this.DOM.inspector.querySelector('.data-y');
                if (xDisplay) xDisplay.textContent = nextX;
                if (yDisplay) yDisplay.textContent = nextY;
            }
        };

        const processMouseUp = () => {
            if (!isDragging) return;
            isDragging = false;
            element.classList.remove('dragging-active');
            
            document.removeEventListener('mousemove', processMouseMove);
            document.removeEventListener('mouseup', processMouseUp);
            
            console.log(`L.A.U. Spatial Interlock Updated: Asset node ID ${asset.id} relocated.`);
        };
    },

    populateDetailsInspector(asset) {
        if (!this.DOM.inspector) return;

        const template = document.getElementById('AssetInspectorTemplate');
        if (!template) {
            console.error("System Error: AssetInspectorTemplate block missing from HTML.");
            return;
        }

        const clone = template.content.cloneNode(true);

        clone.querySelector('.data-type').textContent = asset.type || 'UNKNOWN NODE';
        clone.querySelector('.data-name').textContent = asset.objectname || 'Unnamed Structural Node';
        clone.querySelector('.data-id').textContent = asset.id;
        clone.querySelector('.data-desc').textContent = asset.description || 'No database profile entries logged for this row asset.';
        clone.querySelector('.data-x').textContent = asset.pos_x;
        clone.querySelector('.data-y').textContent = asset.pos_y;
        clone.querySelector('.data-w').textContent = asset.width || CONFIG.DEFAULT_SIZE;
        clone.querySelector('.data-h').textContent = asset.height || CONFIG.DEFAULT_SIZE;
        clone.querySelector('.data-status').textContent = asset.status || 'Active Operations Logs';

        const statusWrapper = clone.querySelector('.dynamic-status-wrapper');
        if (statusWrapper) {
            const statusClass = `status-${(asset.status || 'Active').toLowerCase()}`;
            statusWrapper.className = `inspector-status-indicator text-sm font-bold ${statusClass}`;
        }

        // Links the Edit Button within the right slide panel to open the custom form card modal instead of browser prompts
        const editBtn = clone.querySelector('.AssetRegistry_EditTriggerBtn');
        if (editBtn) {
            editBtn.onclick = (e) => {
                e.preventDefault();
                this.handleEditAsset(asset);
            };
        }

        this.DOM.inspector.innerHTML = "";
        this.DOM.inspector.appendChild(clone);
    },

    highlightActiveMapNode(activeId) {
        document.querySelectorAll('.CanvasSpatialBlock').forEach(block => {
            block.classList.remove('node-highlighted-active');
            block.style.border = "1px solid #000000"; 
            block.style.backgroundColor = ""; 
        });

        const activeBlock = document.querySelector(`.CanvasSpatialBlock[data-id="${activeId}"]`);
        if (activeBlock) {
            activeBlock.classList.add('node-highlighted-active');
            activeBlock.style.border = "2px solid red";
            activeBlock.style.backgroundColor = "rgba(255, 0, 0, 0.1)";
        }
    },

    executeCombinedFilter() {
        const query = AppState.assetSearchQuery || "";
        if (!AppState.assetRecords) return;

        const filtered = AppState.assetRecords.filter(item => {
            const matchesSearch = (item.objectname || "").toLowerCase().includes(query) || 
                                  (item.type || "").toLowerCase().includes(query) ||
                                  String(item.id).includes(query);
            return matchesSearch;
        });

        this.renderHierarchicalFolderTree(filtered);
        this.renderCanvasGridBlocks(filtered);
    },

    handleCreateNewAsset() {
        if (this.DOM.dataForm) this.DOM.dataForm.reset();
        if (this.DOM.formId) this.DOM.formId.value = "";
        if (this.DOM.modalTitle) this.DOM.modalTitle.innerText = "Add New Asset Node";
        if (this.DOM.formOverlay) this.DOM.formOverlay.style.display = "flex";
    },

    handleEditAsset(asset) {
        if (this.DOM.modalTitle) this.DOM.modalTitle.innerText = "Modify Asset Parameters";
        if (this.DOM.formId) this.DOM.formId.value = asset.id;
        if (this.DOM.formName) this.DOM.formName.value = asset.objectname || "";
        if (this.DOM.formType) this.DOM.formType.value = asset.type || "";
        if (this.DOM.formDesc) this.DOM.formDesc.value = asset.description || "";
        
        if (this.DOM.formOverlay) this.DOM.formOverlay.style.display = "flex";
    },

    handleCloseForm() {
        if (this.DOM.formOverlay) this.DOM.formOverlay.style.display = "none";
    },

    handleFormSubmit(e) {
        e.preventDefault();
        if (!AppState.assetRecords) AppState.assetRecords = [];

        const targetId = this.DOM.formId ? this.DOM.formId.value : "";
        const nameVal = this.DOM.formName ? this.DOM.formName.value.trim() : "";
        const typeVal = this.DOM.formType ? this.DOM.formType.value.toUpperCase().trim() : "EQUIPMENT";
        const descVal = this.DOM.formDesc ? this.DOM.formDesc.value.trim() : "";

        if (targetId) {
            // Edit Mode Pipeline Update Block Execution
            const asset = AppState.assetRecords.find(a => a.id == targetId);
            if (asset) {
                asset.objectname = nameVal;
                asset.type = typeVal;
                asset.description = descVal;
                this.populateDetailsInspector(asset);
            }
        } else {
            // Creation Mode Pipeline Block Execution
            const nextId = AppState.assetRecords.length ? Math.max(...AppState.assetRecords.map(a => a.id)) + 1 : 101;
            const newAsset = {
                id: nextId,
                objectname: nameVal,
                type: typeVal,
                description: descVal,
                pos_x: 60,
                pos_y: 60,
                width: CONFIG.DEFAULT_SIZE || 100,
                height: CONFIG.DEFAULT_SIZE || 100,
                status: "Active"
            };
            AppState.assetRecords.push(newAsset);
            this.populateDetailsInspector(newAsset);
            this.highlightActiveMapNode(newAsset.id);
        }

        this.renderHierarchicalFolderTree(AppState.assetRecords);
        this.renderCanvasGridBlocks(AppState.assetRecords);
        this.handleCloseForm();
    }
};