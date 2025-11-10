class GestionEntrees {
    constructor() {
        this.prestations = [];
        this.kioskItems = {};
        this.selectedDayFilter = null;
        this.isPreviewActive = false;
        this.draggedItem = null;
        this.draggedPure = null;
        this.editingPrestationId = null;
        this.token = localStorage.getItem('token');
        this.apiBaseUrl = '/api/entrees';
        
        // Initialisation des éléments DOM
        this.initializeElements();

        // CORRECTION : Appeler bindEvents() ICI, dans le constructeur.
        // Il ne sera ainsi exécuté qu'une seule fois.
        this.bindEvents();
    }

    async saveOrder() {
        if (!this.token) {
            this.showMessage('Token manquant, impossible de sauvegarder l\'ordre', 'error');
            return;
        }

        // 1. Créer le payload à envoyer à l'API
        // Le tableau this.prestations est déjà dans le bon ordre
        const orderPayload = this.prestations.map((prestation, index) => {
            return { id: prestation.id, order: index };
        });

        try {
            const response = await fetch(`${this.apiBaseUrl}/order`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(orderPayload)
            });

            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }

            console.log('Ordre sauvegardé avec succès.');

        } catch (error) {
            console.error('Erreur lors de la sauvegarde de l\'ordre:', error);
            this.showMessage('Erreur lors de la sauvegarde de l\'ordre', 'error');
        }
    }

    // ✅ NOUVELLE FONCTION : Sauvegarde automatique de l'ordre par jour
    async saveDayOrders() {
        if (!this.token) {
            this.showMessage('Token manquant, impossible de sauvegarder l\'ordre', 'error');
            return;
        }

        const orderPayload = this.prestations
            .filter(p => p.dayOrders && Object.keys(p.dayOrders).length > 0)
            .map(prestation => ({
                id: prestation.id,
                dayOrders: prestation.dayOrders
            }));

        try {
            const response = await fetch(`${this.apiBaseUrl}/day-orders`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(orderPayload)
            });

            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }

            console.log('✅ Ordre par jour sauvegardé automatiquement');

        } catch (error) {
            console.error('❌ Erreur lors de la sauvegarde de l\'ordre par jour:', error);
            this.showMessage('Erreur lors de la sauvegarde de l\'ordre', 'error');
        }
    }

    initializeElements() {
        // --- Panneau Admin ---
        this.dashboardContainer = document.getElementById('gestion-tickets-entree');
        this.accessList = document.getElementById('access-prestations-list');
        this.pureList = document.getElementById('pure-prestations-list');
        this.separatorLine = document.getElementById('separator-line');
        this.previewSection = document.getElementById('preview-section');
        this.accessForm = document.getElementById('access-form');
        this.pureContainer = document.getElementById('pure-container');
        this.saveBtn = document.querySelector('.gestion-entrees .save-btn');
        this.previewBtn = document.querySelector('.gestion-entrees .preview-btn');
        
        // Champs de formulaire
        this.daysCheckboxes = document.getElementById('days-checkboxes');
        this.accessPresentationLow = document.getElementById('access-presentation-low');
        this.accessPresentationNormal = document.getElementById('access-presentation-normal');
        this.accessPresentationAlcohol = document.getElementById('access-presentation-alcohol');
        this.accessPresentationSoft = document.getElementById('access-presentation-soft');
        this.accessPrice = document.getElementById('access-price');
        this.accessSex = document.getElementById('access-sex');

        // --- Panneau Kiosque (NOUVEAU) ---
        this.toggleBtn = document.getElementById('toggle-interface-btn');
        this.toggleBackBtn = document.getElementById('toggle-back-btn');
        this.kioskContainer = document.getElementById('kiosk-view');
        this.kioskSubtitle = document.getElementById('kiosk-subtitle');
        this.kioskAccessContainer = document.getElementById('access-items-kiosk');
        this.kioskPureContainer = document.getElementById('pure-items-kiosk');
        this.kioskAccessSection = document.getElementById('access-soiree-kiosk');
        this.kioskPureSection = document.getElementById('pure-soiree-kiosk');
        this.kioskSeparator = this.kioskContainer.querySelector('.kiosk-separator');
        this.kioskTotalDiscount = document.getElementById('kiosk-total-discount');
        this.kioskTotalPrice = document.getElementById('kiosk-total-price');
        this.kioskCheckoutBtn = document.getElementById('kiosk-checkout-btn');
    }

    async init() {
        await this.loadData();
        this.addPure();
        this.renderPrestations();
        this.setupTooltips();
        await this.updateKioskHeader();
        this.renderKioskItems();
        this.resetInterfaceState();
    }

    // 🆕 NOUVELLE FONCTION : Récupérer le nom de la discothèque
    async getDiscoName() {
        try {
            const token = localStorage.getItem('token');
            if (!token) return 'Nom de la discothèque';

            const response = await fetch('/api/profile', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                return data.discoName || 'Nom de la discothèque';
            }
        } catch (error) {
            console.error('Erreur lors de la récupération du nom:', error);
        }
        return 'Nom de la discothèque';
    }

    // 🆕 NOUVELLE FONCTION : Formater la date du jour
    getFormattedDate() {
        const today = new Date();
        const daysOfWeek = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
        const months = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
        
        const dayName = daysOfWeek[today.getDay()];
        const day = today.getDate();
        const month = months[today.getMonth()];
        const year = today.getFullYear();
        
        return `${dayName} ${day} ${month} ${year}`;
    }

    // 🆕 NOUVELLE FONCTION : Mettre à jour le header du kiosque
    async updateKioskHeader() {
        const kioskHeader = this.kioskContainer.querySelector('.kiosk-header');
        if (!kioskHeader) return;

        const discoName = await this.getDiscoName();
        const formattedDate = this.getFormattedDate();
        
        kioskHeader.innerHTML = `
            <h1>${discoName}</h1>
            <div class="subtitle">${formattedDate}</div>
            <div class="entrees-wrapper">
                <div>Votre Soirée</div>
                <div class="subtitle">Choisissez vos accès et consommations</div>
            </div>
        `;
    }

    // --- MÉTHODES DE CHARGEMENT ET SAUVEGARDE ---

    async loadData() {
        if (!this.token) {
            console.warn('Aucun token disponible');
            return;
        }

        try {
            const response = await fetch(this.apiBaseUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }

            const data = await response.json();
            this.prestations = Array.isArray(data) ? data : [];
            this.renderPrestations();
            this.renderKioskItems();
        } catch (error) {
            console.error('Erreur lors du chargement des données:', error);
            this.showMessage('Erreur lors du chargement des prestations', 'error');
        }
    }

    async saveData(prestation) {
        if (!this.token) {
            this.showMessage('Token manquant', 'error');
            return false;
        }

        try {
            this.showLoading(true);

            console.log('Données envoyées à l\'API:', JSON.stringify(prestation, null, 2));   

            const response = await fetch(this.apiBaseUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(prestation)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Erreur HTTP: ${response.status}`);
            }

            const result = await response.json();
            this.showMessage('Prestation enregistrée avec succès', 'success');
            await this.loadData();
            return true;
        } catch (error) {
            console.error('Erreur lors de la sauvegarde:', error);
            this.showMessage(`Erreur: ${error.message}`, 'error');
            return false;
        } finally {
            this.showLoading(false);
        }
    }

    async updateData(id, prestation) {
        if (!this.token) {
            this.showMessage('Token manquant', 'error');
            return false;
        }

        try {
            this.showLoading(true);
            const response = await fetch(`${this.apiBaseUrl}/${id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(prestation)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Erreur HTTP: ${response.status}`);
            }

            this.showMessage('Prestation mise à jour avec succès', 'success');
            await this.loadData();
            return true;
        } catch (error) {
            console.error('Erreur lors de la mise à jour:', error);
            this.showMessage(`Erreur: ${error.message}`, 'error');
            return false;
        } finally {
            this.showLoading(false);
        }
    }

    async deleteData(index) {
        if (!this.token || !this.prestations[index]) {
            return false;
        }

        const prestation = this.prestations[index];
        if (!prestation.id) {
            this.prestations.splice(index, 1);
            this.renderPrestations();
            this.updateOrderNumbers();
            return true;
        }

        try {
            this.showLoading(true);

            const response = await fetch(`${this.apiBaseUrl}/${prestation.id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }

            this.showMessage('Prestation supprimée avec succès', 'success');
            await this.loadData();
            this.updateOrderNumbers();
            return true;
        } catch (error) {
            console.error('Erreur lors de la suppression:', error);
            this.showMessage(`Erreur: ${error.message}`, 'error');
            return false;
        } finally {
            this.showLoading(false);
        }
    }

    async deleteDataById(id) {
        if (!this.token || !id) {
            return false;
        }

        // Trouver l'index réel dans le tableau complet
        const index = this.prestations.findIndex(p => p.id == id);
        
        if (index === -1) {
            console.error('Prestation non trouvée avec l\'ID:', id);
            return false;
        }

        // Utiliser la fonction deleteData existante avec le bon index
        return await this.deleteData(index);
    }

    toggleInterface() {
    const adminContent = this.dashboardContainer.querySelector('.container');
    const toggleBackButton = document.getElementById('toggle-back-btn');

    if (adminContent.style.display === 'none') {
        // On retourne à l'admin (pas de changement ici)
        adminContent.style.display = 'block';
        this.kioskContainer.style.display = 'none';
        this.toggleBtn.style.display = 'block';
        if(toggleBackButton) toggleBackButton.style.display = 'none';

    } else {
        // On passe au kiosque
        
        // --- AJOUT IMPORTANT ---
        // On reconstruit l'affichage du kiosque avec les données à jour (le nouvel ordre)
        // juste avant de l'afficher.
        this.renderKioskItems();
        // --- FIN DE L'AJOUT ---
        
        adminContent.style.display = 'none';
        this.kioskContainer.style.display = 'block';
        this.toggleBtn.style.display = 'none';
        if(toggleBackButton) toggleBackButton.style.display = 'block';
    }
}

resetInterfaceState() {
    const adminContent = this.dashboardContainer.querySelector('.container');
    const toggleBackButton = document.getElementById('toggle-back-btn');

    // S'assurer que l'interface admin est visible
    if (adminContent) {
        adminContent.style.display = 'block';
    }
    
    // S'assurer que le kiosque est caché
    if (this.kioskContainer) {
        this.kioskContainer.style.display = 'none';
    }
    
    // S'assurer que le bon bouton est visible
    if (this.toggleBtn) {
        this.toggleBtn.style.display = 'block';
    }
    
    if (toggleBackButton) {
        toggleBackButton.style.display = 'none';
    }
}

    renderKioskItems() {
    if (!this.kioskContainer) return;

    this.kioskAccessContainer.innerHTML = '';
    this.kioskPureContainer.innerHTML = '';
    this.kioskItems = {};

    const today = new Date();
    const daysOfWeek = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
    const currentDay = daysOfWeek[today.getDay()];

    // ✅ Filtrer par jour actuel
    let todayPrestations = this.prestations.filter(p => p.days && p.days.includes(currentDay));
    
    // ✅ NOUVEAU : Trier selon l'ordre du jour actuel
    todayPrestations.sort((a, b) => {
        const orderA = (a.dayOrders && a.dayOrders[currentDay]) ?? 999999;
        const orderB = (b.dayOrders && b.dayOrders[currentDay]) ?? 999999;
        return orderA - orderB;
    });

    let hasAccess = false;
    let hasPure = false;

    // --- Rendu des "Accès Soirée" (inchangé) ---
    todayPrestations.forEach((prestation, prestationIndex) => {
        if (this.hasAccessData(prestation)) {
            hasAccess = true;
            const price = parseFloat(prestation.price) || 0;
            ['Low', 'Normal', 'Alcohol', 'Soft'].forEach(type => {
                const presentationName = prestation[`presentation${type}`];
                if (presentationName) {
                    const id = `access-${type.toLowerCase()}-${prestationIndex}`;
                    this.kioskItems[id] = { name: presentationName, price, qty: 0, maxQty: 10 };
                    this.kioskAccessContainer.innerHTML += this.createKioskItemHTML(id, presentationName, price);
                }
            });
        }
    });

    // --- NOUVELLE LOGIQUE POUR "Pure Soirée" AVEC REGROUPEMENT PAR CATÉGORIE ---
    const pureItemsGrouped = {}; // Objet pour stocker les articles regroupés

    // 1. On parcourt et on regroupe les articles par catégorie
    todayPrestations.forEach((prestation, prestationIndex) => {
        if (prestation.pureItems && prestation.pureItems.length > 0) {
            hasPure = true;
            prestation.pureItems.forEach((pure, pureIndex) => {
                pure.details.forEach((detail, detailIndex) => {
                    // Utiliser une chaîne vide si aucune catégorie n'est définie
const category = detail.category || '';
if (!pureItemsGrouped[category]) {
    pureItemsGrouped[category] = [];
}

                    const id = `pure-${prestationIndex}-${pureIndex}-${detailIndex}`;
                    // On stocke l'objet complet pour le rendu
                    pureItemsGrouped[category].push({ id, detail }); 

                    // On enregistre l'article pour le suivi des quantités
                    this.kioskItems[id] = {
                        name: detail.name,
                        category: detail.category || '',
                        price: parseFloat(detail.price) || 0,
                        maxEntries: detail.maxEntries || { 1: 1 },
                        currentMaxEntries: (detail.maxEntries && detail.maxEntries[1]) ? detail.maxEntries[1] : 1,
                        discount: parseFloat(detail.discount) || 0,
                        qty: 0,
                        maxQty: detail.maxEntries ? Math.max(...Object.keys(detail.maxEntries).map(Number)) : 1
                    };
                });
            });
        }
    });

    // 2. On construit le HTML à partir des groupes
    if (hasPure) {
    let pureHtml = '';
    // On parcourt chaque catégorie (ex: 'WHISKY', 'Autres')
    for (const category in pureItemsGrouped) {
        // ✅ N'ajoute le titre que si la catégorie n'est pas vide
        if (category && category.trim() !== '') {
            pureHtml += `<div class="kiosk-item"><div class="kiosk-item-category">${this.sanitizeInput(category)}</div></div>`;
        }
        
        // Ajoute chaque article de cette catégorie
        pureItemsGrouped[category].forEach(item => {
            pureHtml += this.createKioskItemHTML(item.id, item.detail.name, item.detail.price, item.detail.maxEntries);
        });
    }
    this.kioskPureContainer.innerHTML = pureHtml;
}

    // --- Gestion de la visibilité (inchangé) ---
    this.kioskAccessSection.style.display = hasAccess ? 'block' : 'none';
    this.kioskPureSection.style.display = hasPure ? 'block' : 'none';
    this.kioskSeparator.style.display = (hasAccess && hasPure) ? 'block' : 'none';

    this.attachKioskQuantityListeners();
    this.updateKioskTotal();
}

    createKioskItemHTML(id, name, price, maxEntries = null) {
        let maxEntriesHTML = '';
        if (maxEntries) {
            const initialMax = (maxEntries && maxEntries[1]) ? maxEntries[1] : 1;
            maxEntriesHTML = `<div class="kiosk-item-max" id="${id}-max-entries">Max. Entrées: <span class="kiosk-max-value">${initialMax}</span></div>`;
        }

        return `
            <div class="kiosk-item">
                <div class="kiosk-item-content">
                    <div class="kiosk-item-name">${this.sanitizeInput(name)}</div>
                    <div class="kiosk-item-price-container">
                        <div class="kiosk-item-price">${price}€</div>
                        ${maxEntriesHTML}
                    </div>
                    <div class="kiosk-quantity-control">
                        <button class="kiosk-qty-btn" data-id="${id}" data-action="decrease">-</button>
                        <div id="${id}-qty" class="kiosk-qty-value">0</div>
                        <button class="kiosk-qty-btn" data-id="${id}" data-action="increase">+</button>
                    </div>
                </div>
            </div>`;
    }

    attachKioskQuantityListeners() {
        this.kioskContainer.querySelectorAll('.kiosk-qty-btn').forEach(button => {
            button.replaceWith(button.cloneNode(true));
        });
        this.kioskContainer.querySelectorAll('.kiosk-qty-btn').forEach(button => {
            button.addEventListener('click', (event) => this.handleKioskQuantityClick(event));
        });
    }

    handleKioskQuantityClick(event) {
        const button = event.currentTarget;
        const id = button.dataset.id;
        const action = button.dataset.action;
        this.updateKioskQuantity(id, action === 'increase' ? 1 : -1);
    }
    
    updateKioskQuantity(itemId, change) {
        if (!this.kioskItems[itemId]) return;
        const item = this.kioskItems[itemId];
        const newQty = item.qty + change;

        if (newQty >= 0 && newQty <= (item.maxQty || 10)) {
            item.qty = newQty;
            document.getElementById(`${itemId}-qty`).textContent = newQty;
            
            if (item.maxEntries) {
                item.currentMaxEntries = item.maxEntries[newQty] || item.currentMaxEntries;
                const maxEntriesElement = document.getElementById(`${itemId}-max-entries`);
                if (maxEntriesElement) {
                    maxEntriesElement.querySelector('.kiosk-max-value').textContent = item.currentMaxEntries || 0;
                }
            }
            this.updateKioskTotal();
        }
    }
    
    updateKioskTotal() {
    let total = 0;
    let discountTotal = 0;
    let itemCount = 0;
    let orderHTML = '';
    
    for (const item of Object.values(this.kioskItems)) {
        total += (item.price || 0) * item.qty;
        itemCount += item.qty;
        
        // Calcul de la réduction
        if (item.discount > 0 && item.qty > 1) {
            discountTotal += (item.qty - 1) * item.discount;
        }
        
        // Construction du récapitulatif
        if (item.qty > 0) {
            const itemTotal = (item.price || 0) * item.qty;
            orderHTML += `
                <div class="order-line">
                    <span class="order-qty">${item.qty}</span>
                    <span class="order-name">${this.sanitizeInput(item.name)}</span>
                    <span class="order-price">${itemTotal.toFixed(2)}€</span>
                </div>
            `;
        }
    }
    
    // Mise à jour du récapitulatif
    const orderSummary = document.getElementById('kiosk-order-summary');
    if (orderSummary) {
        if (orderHTML) {
            orderSummary.innerHTML = orderHTML;
        } else {
            orderSummary.innerHTML = '<div class="order-empty">Aucun article sélectionné</div>';
        }
    }
    
    // Mise à jour du total et de la réduction
    if (this.kioskTotalPrice) {
        this.kioskTotalPrice.textContent = `${(total - discountTotal).toFixed(2)}€`;
    }
    
    if (this.kioskTotalDiscount) {
        this.kioskTotalDiscount.textContent = discountTotal > 0 ? 
            `(Réduc. bouteille suppl.: -${discountTotal.toFixed(2)}€)` : '';
    }
    
    // ✅ CORRECTION : Chercher le bouton avec les deux IDs possibles + vérification
    const validateBtn = document.getElementById('validate-kiosk-btn') || 
                        document.getElementById('kiosk-checkout-btn');
    
    if (validateBtn) {
        validateBtn.disabled = itemCount === 0;
        
        // Mettre à jour le texte du bouton si c'est le nouveau
        if (validateBtn.id === 'validate-kiosk-btn') {
            const nombrePersonnes = parseInt(localStorage.getItem('kioskGroupSize')) || 1;
            const personneText = nombrePersonnes === 1 ? 'PERSONNE' : 'PERSONNES';
            validateBtn.textContent = `VALIDER POUR ${nombrePersonnes} ${personneText}`;
        }
    } else {
        // Si le bouton n'existe pas, ce n'est pas grave (on n'est pas sur kiosk-view)
        console.log('ℹ️ [GestionEntrees] Bouton validation non trouvé (normal si pas en mode kiosque)');
    }
}

    handleKioskCheckout() {
        let summary = 'Récapitulatif de la commande :\n';
        // ... (logique de l'ancien code pour générer le récapitulatif) ...
        alert(summary);
    }

    updateOrderNumbers() {
    // Mise à jour des ordres dans access-prestations-list
    const accessItems = this.accessList.querySelectorAll('.prestation-item');
    accessItems.forEach((item, index) => {
        const orderNumber = index + 1;
        const orderElement = item.querySelector('.prestation-order');
        if (orderElement) {
            orderElement.textContent = orderNumber;
        }
        item.dataset.order = orderNumber;
    });
    
    // ✅ CORRECTION : Mise à jour des ordres dans pure-prestations-list
    const pureItems = this.pureList.querySelectorAll('.prestation-item.pure-item');
    
    // On regroupe les items par prestation ID pour ne compter qu'une fois par prestation
    const processedIds = new Set();
    let currentOrder = 1;
    
    pureItems.forEach((item) => {
        const itemId = item.dataset.id;
        
        // Si c'est une nouvelle prestation (pas encore traitée)
        if (!processedIds.has(itemId)) {
            // On met à jour le numéro d'ordre de la première ligne
            const orderElement = item.querySelector('.prestation-order-pure');
            if (orderElement) {
                orderElement.textContent = currentOrder;
            }
            item.dataset.order = currentOrder;
            
            // On marque cette prestation comme traitée
            processedIds.add(itemId);
            currentOrder++;
        } else {
            // C'est la même prestation, on garde le même ordre mais on ne l'affiche pas
            item.dataset.order = currentOrder - 1;
        }
    });
}

    // --- GESTION DES ÉVÉNEMENTS ---

     bindEvents() {
        if (this.saveBtn) {
            this.saveBtn.addEventListener('click', () => this.savePrestation());
        }

        if (this.toggleBtn) {
            this.toggleBtn.addEventListener('click', () => this.toggleInterface());
        }

        if (this.toggleBackBtn) {
    this.toggleBackBtn.addEventListener('click', () => this.toggleInterface());
}
        
        if(this.kioskCheckoutBtn) {
            this.kioskCheckoutBtn.addEventListener('click', () => this.handleKioskCheckout());
        }

        document.querySelectorAll('.day-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const day = e.target.textContent.trim();
                this.filterByDay(day);
            });
        });

        if (this.previewBtn) {
            this.previewBtn.addEventListener('click', () => this.showPreview());
        }

        const addPureBtn = document.querySelector('.add-pure-btn');
        if (addPureBtn) {
            addPureBtn.addEventListener('click', () => this.addPure());
        }

        document.addEventListener('click', (e) => {
            const editors = document.querySelectorAll('.max-entries-editor');
            editors.forEach(editor => {
                if (!editor.contains(e.target) && 
                    !editor.parentElement.querySelector('.pure-max-entries').contains(e.target)) {
                    editor.style.display = 'none';
                }
            });
        });
    }

    // --- GESTION DES FORMULES BOUTEILLE ---

   addPure() {
    const pureDiv = document.createElement('div');
    pureDiv.className = 'pure-row';
    // MODIFICATION DE LA STRUCTURE HTML CI-DESSOUS
    pureDiv.innerHTML = `
        <div class="category-section">
            <div>
                <label>Catégorie de bouteille (optionnel)</label>
                <input type="text" list="bottle-categories" placeholder="Catégorie (saisie ou choix)" class="pure-category-input">
                <datalist id="bottle-categories">
                    <option value="VODKA">
                    <option value="WHISKY">
                    <option value="RUM">
                    <option value="JÄGERBOMB">
                    <option value="TEQUILA">
                    <option value="COGNAC">
                    <option value="CHAMPAGNE">
                </datalist>
            </div>
        </div>

        <div class="details-section">
            
            <div class="name-section">
                <div>
                    <label>Nom</label>
                    <input type="text" placeholder="Ex: Bouteille 75cl" class="pure-name">
                </div>
                <input type="hidden" class="pure-qty" value="1">
                <div>
                    <label>Prix</label>
                    <input type="number" step="0.01" min="0" placeholder="Prix (€)" class="pure-price">
                </div>
                <div>
                    <label>Max. Entrée</label>
                    <input type="text" placeholder="Cliquez pour définir" class="pure-max-entries" readonly>
                </div>
                <div>
                    <label>Réduc. bouteille suppl.</label>
                    <input type="number" step="0.01" min="0" placeholder="Réduction (€)" class="pure-discount">
                </div>
                <div class="pure-row-actions">
                    <div class="move-buttons-group">
                        <button type="button" class="detail-move-btn" data-direction="up" aria-label="Monter cette ligne">▲</button>
                        <button type="button" class="detail-move-btn" data-direction="down" aria-label="Descendre cette ligne">▼</button>
                    </div>
                    <div class="action-buttons-group">
                        <button type="button" class="pure-duplicate-btn" aria-label="Dupliquer la formule">📋</button>
                        <button type="button" class="pure-delete-btn" aria-label="Supprimer la formule">🗑️</button>
                    </div>
                </div>
            </div>

            <button type="button" class="add-details-btn" aria-label="Ajouter des détails">+</button>
        </div>
    `;

    this.pureContainer.appendChild(pureDiv);
    this.bindPureEvents(pureDiv);

    // Synchronisation des noms (code existant)
    const mainNameInput = pureDiv.querySelector('.name-section .pure-name');
    mainNameInput.addEventListener('input', (e) => {
        const currentName = e.target.value;
        const parentRow = e.target.closest('.pure-row');
        if (parentRow) {
            const detailNameInputs = parentRow.querySelectorAll('.details-section .pure-name');
            detailNameInputs.forEach(input => {
                input.value = currentName;
            });
        }
    });
}

// Fonction bindPureEvents() corrigée
bindPureEvents(pureDiv) {
    const duplicateBtn = pureDiv.querySelector('.pure-duplicate-btn');
    duplicateBtn.addEventListener('click', () => this.duplicatePure(duplicateBtn));

    const deleteBtn = pureDiv.querySelector('.pure-delete-btn');
    deleteBtn.addEventListener('click', () => this.deletePure(deleteBtn));

    const addDetailsBtn = pureDiv.querySelector('.add-details-btn');
    addDetailsBtn.addEventListener('click', () => this.addDetails(addDetailsBtn));

    const maxEntriesInput = pureDiv.querySelector('.pure-max-entries');
    maxEntriesInput.addEventListener('click', () => this.showMaxEntriesEditor(maxEntriesInput));
    
    // MODIFICATION : Appeler la nouvelle fonction unifiée pour tous les boutons de déplacement
    pureDiv.querySelectorAll('.detail-move-btn').forEach(btn => {
        btn.addEventListener('click', () => this.moveDetailItem(btn));
    });
}

// Nouvelle fonction pour déplacer les pure-row
movePureRow(button) {
    const direction = button.dataset.direction;
    const rowToMove = button.closest('.pure-row');

    if (direction === 'up') {
        const previousRow = rowToMove.previousElementSibling;
        if (previousRow) {
            this.pureContainer.insertBefore(rowToMove, previousRow);
        }
    } else if (direction === 'down') {
        const nextRow = rowToMove.nextElementSibling;
        if (nextRow) {
            nextRow.after(rowToMove);
        }
    }
}

    duplicatePure(button) {
        const originalRow = button.closest('.pure-row');
        const newRow = originalRow.cloneNode(true);
        
        this.bindPureEvents(newRow);
        
        this.pureContainer.appendChild(newRow);
    }

    deletePure(button) {
        const row = button.closest('.pure-row');
        row.remove();
        
        if (this.pureContainer.children.length === 0) {
            this.addPure();
        }
    }

// DANS LA CLASSE GestionEntrees

addDetails(button) {
    const detailsSection = button.parentElement;
    const pureRow = detailsSection.parentElement;
    const nameSection = pureRow.querySelector('.name-section');
    const lastDetailsRow = detailsSection.querySelector('.details-row:last-child') || nameSection;

    const newDetailsRow = document.createElement('div');
    newDetailsRow.className = 'details-row';

    const sourceMaxEntries = lastDetailsRow.querySelector('.pure-max-entries')?.dataset.maxEntries || '';

    newDetailsRow.innerHTML = `
        <div>
            <label>Nom</label>
            <input type="text" value="" placeholder="Bouteille 100cl" class="pure-name">
        </div>
        <input type="hidden" class="pure-qty" value="1">
        <div>
            <label>Prix</label>
            <input type="number" step="0.01" min="0" value="" placeholder="Prix (€)" class="pure-price">
        </div>
        <div>
            <label>Max. Entrée</label>
            <input type="text" placeholder="Cliquez pour définir" class="pure-max-entries" readonly data-max-entries='${sourceMaxEntries}'>
        </div>
        <div>
            <label>Réduc. bouteille suppl.</label>
            <input type="number" step="0.01" min="0" value="" placeholder="Réduction (€)" class="pure-discount">
        </div>
        <div class="details-row-actions">
            <div class="move-buttons-group">
                <button type="button" class="detail-move-btn" data-direction="up" aria-label="Monter ce détail">▲</button>
                <button type="button" class="detail-move-btn" data-direction="down" aria-label="Descendre ce détail">▼</button>
            </div>
            <div class="action-buttons-group">
                <button type="button" class="delete-details-btn" aria-label="Supprimer les détails">🗑️</button>
            </div>
        </div>
    `;

    detailsSection.insertBefore(newDetailsRow, button);

    // Lier les événements (code existant)
    const maxEntriesInput = newDetailsRow.querySelector('.pure-max-entries');
    maxEntriesInput.addEventListener('click', () => this.showMaxEntriesEditor(maxEntriesInput));
    
    const deleteBtn = newDetailsRow.querySelector('.delete-details-btn');
    deleteBtn.addEventListener('click', () => this.deleteDetails(deleteBtn));

    // Lier les événements pour les boutons de déplacement
    newDetailsRow.querySelectorAll('.detail-move-btn').forEach(btn => {
    btn.addEventListener('click', () => this.moveDetailItem(btn)); // Utiliser la nouvelle fonction
});
}

/**
 * Déplace un élément (name-section ou details-row) vers le haut ou vers le bas
 * à l'intérieur de son conteneur '.details-section'.
 * @param {HTMLElement} button Le bouton sur lequel on a cliqué.
 */

// Dans la classe GestionEntrees, trouvez la fonction moveDetailRow

moveDetailItem(button) {
    const direction = button.dataset.direction;
    // Trouve l'élément à déplacer, qu'il soit un .name-section ou un .details-row
    const itemToMove = button.closest('.name-section, .details-row');
    if (!itemToMove) return;

    const detailsSection = itemToMove.closest('.details-section');
    if (!detailsSection) return;

    // Récupérer la liste de TOUS les éléments déplaçables dans leur ordre actuel
    const allMovableItems = Array.from(detailsSection.querySelectorAll('.name-section, .details-row'));
    const currentIndex = allMovableItems.indexOf(itemToMove);

    if (direction === 'up' && currentIndex > 0) {
        // Déplacer vers le haut : insérer avant l'élément précédent
        const previousItem = allMovableItems[currentIndex - 1];
        previousItem.before(itemToMove);
    } else if (direction === 'down' && currentIndex < allMovableItems.length - 1) {
        // Déplacer vers le bas : insérer après l'élément suivant
        const nextItem = allMovableItems[currentIndex + 1];
        nextItem.after(itemToMove);
    }
}

    deleteDetails(button) {
        button.closest('.details-row').remove();
    }

    // --- GESTION DE L'ÉDITEUR MAX ENTRÉES ---

    showMaxEntriesEditor(input) {
        const oldEditor = document.querySelector('.max-entries-editor');
        if (oldEditor) oldEditor.remove();
       
        const editor = document.createElement('div');
        editor.className = 'max-entries-editor';
       
        editor.innerHTML = `
            <h4>Définir Max. Entrée par Qt. bouteilles</h4>
            <div class="editor-content">
                <div class="max-entries-inputs"></div>
            </div>
            <div class="editor-footer">
                <button type="button" class="add-max-btn">+ Ajouter</button>
                <button type="button" class="cancel-btn">Annuler</button>
                <button type="button" class="save-max-btn">OK</button>
            </div>
        `;
       
        const inputParent = input.parentElement;
        inputParent.style.position = 'relative';
        inputParent.appendChild(editor);
       
        const inputsContainer = editor.querySelector('.max-entries-inputs');
       
        try {
            const maxEntries = JSON.parse(input.dataset.maxEntries || '{}');
            if (Object.keys(maxEntries).length > 0) {
                for (const [qty, max] of Object.entries(maxEntries)) {
                    this.addMaxEntryInput(inputsContainer, parseInt(qty), max);
                }
            }
        } catch (e) {
            console.error("Données maxEntries invalides:", e);
        }
       
        if (inputsContainer.children.length === 0) {
            this.addMaxEntryInput(inputsContainer, 1, '');
        }
       
        editor.querySelector('.add-max-btn').addEventListener('click', () => this.addMaxEntryInput(inputsContainer));
        editor.querySelector('.cancel-btn').addEventListener('click', () => editor.remove());
        editor.querySelector('.save-max-btn').addEventListener('click', () => this.saveMaxEntries(editor, input));
    }

    addMaxEntryInput(container, qty = null, max = '') {
        const existingQtys = Array.from(container.querySelectorAll('.max-entry-input'))
            .map(input => parseInt(input.dataset.qty));
        const nextQty = qty ? qty : Math.max(0, ...existingQtys) + 1;
       
        const row = document.createElement('div');
        row.className = 'max-entry-row';
       
        const isFirstRow = nextQty === 1 && container.children.length === 0;
       
        row.innerHTML = `
            <span>${nextQty} bouteille${nextQty > 1 ? 's' : ''}:</span>
            <div class="input-with-delete">
                ${!isFirstRow ? '<button type="button" class="delete-max-btn" title="Supprimer cette ligne">🗑️</button>' : ''}
                <input type="number" min="1" class="max-entry-input" data-qty="${nextQty}" value="${max}" placeholder="Entrées">
            </div>
        `;
       
        container.appendChild(row);
       
        if (!isFirstRow) {
            const deleteBtn = row.querySelector('.delete-max-btn');
            deleteBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.removeMaxEntryInput(row, container);
            });
        }
    }

    removeMaxEntryInput(row, container) {
        if (!row || !container) {
            console.error('Ligne ou conteneur non trouvé');
            return;
        }
        
        if (container.children.length <= 1) {
            console.log('Impossible de supprimer la dernière ligne');
            return;
        }
       
        row.remove();
        
        console.log(`Ligne supprimée. Lignes restantes: ${container.children.length}`);
       
        if (container.children.length === 0) {
            this.addMaxEntryInput(container, 1, '');
        }
    }

    saveMaxEntries(editor, targetInput) {
        const inputs = editor.querySelectorAll('.max-entry-input');
        const maxEntries = {};
       
        inputs.forEach(input => {
            const qty = parseInt(input.dataset.qty);
            const max = parseInt(input.value);
            if (!isNaN(qty) && !isNaN(max) && max >= 1) {
                maxEntries[qty] = max;
            }
        });

        try {
            targetInput.dataset.maxEntries = JSON.stringify(maxEntries);
            targetInput.value = Object.entries(maxEntries)
                .map(([qty, max]) => `${qty}=${max}`)
                .join(', ') || 'Cliquez pour définir';
        } catch (e) {
            console.error('Erreur de sauvegarde maxEntries:', e);
            targetInput.value = 'Erreur';
        }
       
        editor.remove();
    }

    // --- DRAG AND DROP ---

    addDragEvents(element) {
        element.addEventListener('dragstart', (e) => this.handleDragStart(e, element));
        element.addEventListener('dragover', (e) => this.handleDragOver(e));
        element.addEventListener('drop', (e) => this.handleDrop(e, element));
        element.addEventListener('dragend', (e) => this.handleDragEnd(e, element));
    }

    handleDragStart(e, element) {
        this.draggedItem = element;
        element.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', element.innerHTML);
    }

    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }

  handleDrop(e, element) {
    e.preventDefault();
    
    if (this.draggedItem !== element && this.draggedItem) {
        const container = element.parentElement;
        
        const allItems = Array.from(container.children);
        const fromIndex = allItems.indexOf(this.draggedItem);
        const toIndex = allItems.indexOf(element);

        if (fromIndex < toIndex) {
            element.after(this.draggedItem);
        } else {
            element.before(this.draggedItem);
        }
        
        this.updateOrderNumbers();

        // === LOGIQUE ORDRE PAR JOUR ===
        
        // Vérifier qu'un jour est sélectionné
        if (!this.selectedDayFilter) {
            console.warn('Aucun jour sélectionné');
            return;
        }
        
        // Récupérer les éléments visibles (du jour filtré)
        const visibleElements = [
            ...this.accessList.querySelectorAll('.prestation-item'),
            ...this.pureList.querySelectorAll('.prestation-item.pure-item')
        ];

        const uniqueElements = [];
        const processedIds = new Set();
        
        visibleElements.forEach(el => {
            const id = el.dataset.id;
            if (id && !processedIds.has(id)) {
                uniqueElements.push(el);
                processedIds.add(id);
            }
        });

        const newOrderIds = uniqueElements.map(item => item.dataset.id);

        // ✅ Mettre à jour l'ordre UNIQUEMENT pour le jour filtré actuel
        newOrderIds.forEach((id, index) => {
            const prestation = this.prestations.find(p => String(p.id) === String(id));
            if (prestation) {
                // Initialiser dayOrders si nécessaire
                if (!prestation.dayOrders) {
                    prestation.dayOrders = {};
                }
                // Sauvegarder l'ordre pour ce jour spécifique
                prestation.dayOrders[this.selectedDayFilter] = index;
            }
        });

        // ✅ Sauvegarder automatiquement en base de données
        this.saveDayOrders();
        
        this.attachPrestationEvents();
        this.bindSectionToggleEvents();
    }
}

    handleDragEnd(e, element) {
        element.classList.remove('dragging');
        this.draggedItem = null;
    }

    // --- VALIDATION ---

    validateAccessSoiree() {
        const presentationLow = this.accessPresentationLow;
        const presentationNormal = this.accessPresentationNormal;
        const presentationAlcohol = this.accessPresentationAlcohol;
        const presentationSoft = this.accessPresentationSoft;
        const price = this.accessPrice;

        [presentationLow, presentationNormal, presentationAlcohol, presentationSoft, price]
            .forEach(el => el && el.classList.remove('error'));

        const hasPresentation = presentationLow.value.trim() || 
                               presentationNormal.value.trim() || 
                               presentationAlcohol.value.trim() || 
                               presentationSoft.value.trim();
        const hasPrice = price.value !== '';

        let errors = [];

        if (hasPresentation && !hasPrice) {
            errors.push('Veuillez remplir le champ "Prix" dans "Les entrées" si une présentation est indiquée.');
            price.classList.add('error');
        }

        if (hasPrice && !hasPresentation) {
            errors.push('Veuillez remplir au moins une "Présentation" dans "Les entrées" si un prix est indiqué.');
            [presentationLow, presentationNormal, presentationAlcohol, presentationSoft]
                .forEach(el => el.classList.add('error'));
        }

        return { 
            isValid: hasPresentation && hasPrice, 
            errors 
        };
    }

    validatePureSoiree() {
    const pureRows = document.querySelectorAll('.pure-row');
    let errors = [];
    let hasValidRow = false;

    pureRows.forEach((row, index) => {
        const name = row.querySelector('.name-section .pure-name');
        const price = row.querySelector('.name-section .pure-price');
        const maxEntries = row.querySelector('.name-section .pure-max-entries');
        const category = row.querySelector('.pure-category-input'); // Ajout pour une validation plus complète
        const discount = row.querySelector('.name-section .pure-discount'); // Ajout pour une validation plus complète

        // On réinitialise l'état d'erreur pour tous les champs
        [name, price, maxEntries, category, discount].forEach(el => el && el.classList.remove('error'));

        // NOUVELLE LOGIQUE : On vérifie si l'utilisateur a réellement commencé à remplir la ligne
        const isRowPartiallyFilled = name.value.trim() !== '' || 
                                     price.value.trim() !== '' || 
                                     category.value.trim() !== '' || 
                                     discount.value.trim() !== '';

        const isRowFullyValid = name.value.trim() &&
                                price.value &&
                                (maxEntries.dataset.maxEntries && maxEntries.dataset.maxEntries !== '{}');

        if (isRowFullyValid) {
            hasValidRow = true;

        } 
        // On ne déclenche les erreurs que si la ligne a été entamée mais est invalide
        else if (isRowPartiallyFilled) {
            if (!name.value.trim()) {
                errors.push(`Veuillez remplir le champ "Nom" dans la ligne de bouteille ${index + 1}.`);
                name.classList.add('error');
            }
            if (!price.value) {
                errors.push(`Veuillez remplir le champ "Prix" dans la ligne de bouteille ${index + 1}.`);
                price.classList.add('error');
            }
            if (!maxEntries.dataset.maxEntries || maxEntries.dataset.maxEntries === '{}') {
                errors.push(`Veuillez définir "Max. Entrée" dans la ligne de bouteille ${index + 1}.`);
                maxEntries.classList.add('error');
            }
        }
    });

    return { errors, hasValidRow };
}

    // --- SAUVEGARDE ---

    async savePrestation() {
    // ✅ UNE SEULE confirmation - utilisation de showCustomConfirm
    const userConfirmed = await this.showCustomConfirm('Souhaitez-vous enregistrer les modifications ?');
    
    if (!userConfirmed) {
        return; // L'utilisateur a cliqué sur "Non"
    }

    // Récupération des jours sélectionnés
    const daysCheckboxes = document.querySelectorAll('input[name="days"]:checked');
    const days = Array.from(daysCheckboxes).map(checkbox => checkbox.value);
    
    console.log('Days avant envoi:', days);
    
    let errors = [];

    // Validation des jours
    this.daysCheckboxes.classList.remove('error');
    if (days.length === 0) {
        errors.push('Veuillez sélectionner au moins un jour.');
        this.daysCheckboxes.classList.add('error');
    }

    // Validation des sections
    const accessValidation = this.validateAccessSoiree();
    errors = [...errors, ...accessValidation.errors];

    const { errors: pureErrors, hasValidRow: isPureValid } = this.validatePureSoiree();
    errors = [...errors, ...pureErrors];

    if (!accessValidation.isValid && !isPureValid) {
        errors.push('Veuillez remplir au moins une section complète : "Les entrées" ou "Les entrées avec bouteille".');
    }

    // ❌ SUPPRIMÉ : Plus de confirm() ici - remplacé par une alerte simple
    if (errors.length > 0) {
        // Utilisez une alerte stylée au lieu de alert()
        this.showMessage(errors.join('\n'), 'error');
        return;
    }

    // Préparation des données
    const prestation = {
        days,
        presentationLow: this.sanitizeInput(this.accessPresentationLow.value.trim()),
        presentationNormal: this.sanitizeInput(this.accessPresentationNormal.value.trim()),
        presentationAlcohol: this.sanitizeInput(this.accessPresentationAlcohol.value.trim()),
        presentationSoft: this.sanitizeInput(this.accessPresentationSoft.value.trim()),
        price: parseFloat(this.accessPrice.value) || 0,
        sex: this.accessSex.value,
        pureItems: this.buildPureItems()
    };
    
    console.log('Prestation avant envoi:', prestation);

    // Sauvegarde
    let success;
    if (this.editingPrestationId) {
        success = await this.updateData(this.editingPrestationId, prestation);
    } else {
        success = await this.saveData(prestation);
    }

    if (success) {
        this.resetForm();
    }
}

    buildPureItems() {
        if (!document.querySelectorAll('.pure-row').length) {
            return [];
        }

        return Array.from(document.querySelectorAll('.pure-row')).map(row => {
            const category = this.sanitizeInput(row.querySelector('.pure-category-input').value.trim() || '');
            
            const firstDetail = {
                category,
                name: this.sanitizeInput(row.querySelector('.name-section .pure-name').value),
                qty: parseInt(row.querySelector('.name-section .pure-qty').value) || 1,
                price: parseFloat(row.querySelector('.name-section .pure-price').value) || 0,
                maxEntries: this.parseMaxEntries(row.querySelector('.name-section .pure-max-entries')),
                discount: parseFloat(row.querySelector('.name-section .pure-discount').value) || 0
            };

            const additionalDetails = Array.from(row.querySelectorAll('.details-section .details-row')).map(detailRow => ({
                category,
                name: this.sanitizeInput(detailRow.querySelector('.pure-name').value),
                qty: parseInt(detailRow.querySelector('.pure-qty').value) || 1,
                price: parseFloat(detailRow.querySelector('.pure-price').value) || 0,
                maxEntries: this.parseMaxEntries(detailRow.querySelector('.pure-max-entries')),
                discount: parseFloat(detailRow.querySelector('.pure-discount').value) || 0
            }));

            return { details: [firstDetail, ...additionalDetails] };
        }).filter(item => 
            item.details.some(detail => 
                detail.name.trim() && detail.qty && detail.price
            )
        );
    }

    parseMaxEntries(input) {
        try {
            return input.dataset.maxEntries ? JSON.parse(input.dataset.maxEntries) : { 1: 1 };
        } catch (error) {
            console.error('Erreur parsing maxEntries:', error);
            return { 1: 1 };
        }
    }

    // --- AFFICHAGE ---

     renderPrestations() {
    if (this.dashboardContainer) this.dashboardContainer.classList.remove('preview-active');
    if (!this.accessList || !this.pureList) return;

    if (this.previewBtn) {
        this.previewBtn.classList.remove('active');
    }
    
    this.isPreviewActive = false;
    
    this.accessList.innerHTML = '';
    this.pureList.innerHTML = '';

    const existingMessage = document.querySelector('.no-selection-message');
    if (existingMessage) {
        existingMessage.remove();
    }

    if (!this.selectedDayFilter) {
        this.accessList.style.display = 'none';
        this.pureList.style.display = 'none';
        
        if (this.separatorLine) {
            this.separatorLine.style.display = 'none';
        }
        
        const messageDiv = document.createElement('div');
        messageDiv.className = 'no-selection-message';
        messageDiv.style.cssText = `
            text-align: center;
            padding: 0px 20px;
            color: #b3b3b3;
            font-size: 14px;
            font-style: italic;
        `;
        messageDiv.textContent = 'Sélectionnez un jour pour voir les prestations correspondantes';
        
        const currentPrestationsContainer = document.querySelector('.current-prestations');
        if (currentPrestationsContainer) {
            currentPrestationsContainer.appendChild(messageDiv);
        }
        
        return;
    }

    // ✅ Filtrer par jour
    const filteredPrestations = this.prestations.filter(p => 
        p.days && p.days.includes(this.selectedDayFilter)
    );

    // ✅ Trier selon l'ordre spécifique à ce jour
    filteredPrestations.sort((a, b) => {
        const orderA = (a.dayOrders && a.dayOrders[this.selectedDayFilter]) ?? 999999;
        const orderB = (b.dayOrders && b.dayOrders[this.selectedDayFilter]) ?? 999999;
        return orderA - orderB;
    });

    let hasAccess = false;
    let hasPure = false;

    if (filteredPrestations.some(p => this.hasAccessData(p))) {
        hasAccess = true;
        this.accessList.innerHTML = this.getAccessHeaderHtml();
    }

    if (filteredPrestations.some(p => p.pureItems && p.pureItems.length > 0)) {
        hasPure = true;
        this.pureList.innerHTML = this.getPureHeaderHtml();
    }

  // ✅ Calculer les ordres AVANT le rendu
let accessOrderCounter = 1;
let pureOrderCounter = 1;

filteredPrestations.forEach((prestation) => {
    if (this.hasAccessData(prestation)) {
        this.renderAccessPrestation(prestation, accessOrderCounter);
        accessOrderCounter++;
    }
    
    if (prestation.pureItems && prestation.pureItems.length > 0) {
        this.renderPurePrestation(prestation, pureOrderCounter);
        pureOrderCounter++;
    }
});

    this.accessList.style.display = hasAccess ? '' : 'none';
    this.pureList.style.display = hasPure ? '' : 'none';
    
    if (this.separatorLine) {
        this.separatorLine.style.display = (hasAccess && hasPure) ? 'block' : 'none';
    }

    this.attachPrestationEvents();
    this.updateOrderNumbers();
    this.bindSectionToggleEvents();
}

 bindSectionToggleEvents() {
    const toggleAccessBtn = document.getElementById('toggle-access-section');
    const togglePureBtn = document.getElementById('toggle-pure-section');

    if (toggleAccessBtn && this.accessList) {
        toggleAccessBtn.addEventListener('click', () => {
            // On bascule la classe sur la flèche pour l'animation CSS
            toggleAccessBtn.classList.toggle('expanded');
            // On bascule la classe sur la LISTE des prestations pour les masquer/afficher
            this.accessList.classList.toggle('collapsed');
        });
    }

    if (togglePureBtn && this.pureList) {
        togglePureBtn.addEventListener('click', () => {
            togglePureBtn.classList.toggle('expanded');
            this.pureList.classList.toggle('collapsed');
        });
     }
  }    

    hasAccessData(prestation) {
        return prestation.presentationLow || prestation.presentationNormal || 
               prestation.presentationAlcohol || prestation.presentationSoft || 
               prestation.price;
    }

    getAccessHeaderHtml() {
    return `
        <div class="access-header-row">
            <div class="prestation-label order-label">Ordre:</div>
            <div class="prestation-label">Les entrées:</div>
            <div class="prestation-label">Prestation:</div>
            <div class="prestation-label">Prix:</div>
            <div class="prestation-label">Sexe:</div>
            <div class="button-container">
                <span id="toggle-access-section" class="section-toggle-arrow expanded" title="Réduire/Agrandir la section"></span>
            </div>
        </div>
    `;
}

// Remplacez votre fonction getPureHeaderHtml par celle-ci
getPureHeaderHtml() {
    return `
        <div class="pure-header-row">
            <div class="prestation-label order-label">Ordre:</div>
            <div class="prestation-label">Type:</div>
            <div class="prestation-label">Catégorie:</div>
            <div class="prestation-label">Nom:</div>
            <div class="prestation-label">Qt:</div>
            <div class="prestation-label">Prix:</div>
            <div class="prestation-label">Max. Entrée:</div>
            <div class="prestation-label">Réduc. Suppl.:</div>
            <div class="button-container">
                <span id="toggle-pure-section" class="section-toggle-arrow expanded" title="Réduire/Agrandir la section"></span>
            </div>
        </div>
    `;
}

    renderAccessPrestation(prestation, orderNumber) {
    const accessItem = document.createElement('div');
    accessItem.className = 'prestation-item';
    accessItem.draggable = true;
    accessItem.dataset.id = prestation.id;
    accessItem.dataset.order = orderNumber;

        const presentationRows = [];
        if (prestation.presentationLow) {
            presentationRows.push({ 
                access: 'Heure creuse', 
                prestation: prestation.presentationLow, 
                price: prestation.price, 
                sex: prestation.sex 
            });
        }
        if (prestation.presentationNormal) {
            presentationRows.push({ 
                access: 'Entrée sans Boisson', 
                prestation: prestation.presentationNormal, 
                price: prestation.price, 
                sex: prestation.sex 
            });
        }
        if (prestation.presentationAlcohol) {
            presentationRows.push({ 
                access: 'Entrée + Alcool', 
                prestation: prestation.presentationAlcohol, 
                price: prestation.price, 
                sex: prestation.sex 
            });
        }
        if (prestation.presentationSoft) {
            presentationRows.push({ 
                access: 'Entrée + Soft', 
                prestation: prestation.presentationSoft, 
                price: prestation.price, 
                sex: prestation.sex 
            });
        }

        const detailRows = presentationRows.map((row, rowIndex) => `
            <div class="access-detail-row ${rowIndex % 2 === 0 ? 'even-row' : 'odd-row'}" data-detail-index="${rowIndex}">
                ${rowIndex === 0 ? `<div class="prestation-order">${orderNumber}</div>` : '<div class="prestation-order-empty"></div>'}
                <div class="prestation-value">${this.sanitizeInput(row.access || '-')}</div>
                <div class="prestation-value">${this.sanitizeInput(row.prestation || '-')}</div>
                <div class="prestation-price">${row.price ? `${row.price}€` : '-'}</div>
                <div class="prestation-value prestation-sex">${this.sanitizeInput(row.sex || '-')}</div>
                <div class="button-container">
                    ${rowIndex === 0 ? `
                        <button class="edit-btn" aria-label="Éditer la prestation" data-id="${prestation.id}">✏️</button>
                        <button class="delete-btn" aria-label="Supprimer la prestation" data-id="${prestation.id}">🗑️</button>
                    ` : ''}
                </div>
            </div>
        `).join('');

        accessItem.innerHTML = detailRows;
        this.accessList.appendChild(accessItem);
        this.addDragEvents(accessItem);
    }

    getVisibleAccessPrestations() {
        const filteredPrestations = this.selectedDayFilter 
            ? this.prestations.filter(p => p.days && p.days.includes(this.selectedDayFilter)) 
            : [...this.prestations];
        
        return filteredPrestations.filter(p => this.hasAccessData(p));
    }

    renderPurePrestation(prestation, orderNumber) {
    // ✅ On utilise directement le numéro d'ordre passé en paramètre
    const globalOrderNumber = orderNumber;
    
    prestation.pureItems.forEach((pure, pureIndex) => {
        const pureItem = document.createElement('div');
        pureItem.className = 'prestation-item pure-item';
        pureItem.draggable = true;
        pureItem.dataset.id = prestation.id;
        pureItem.dataset.order = globalOrderNumber;

        const detailRows = pure.details.map((detail, detailIndex) => {
            const maxEntriesText = this.formatMaxEntries(detail.maxEntries);
            
            // ✅ CORRECTION : Le numéro d'ordre n'apparaît QUE sur la première ligne (detailIndex === 0)
            const showOrder = detailIndex === 0;
            const showButtons = detailIndex === 0;
            
            const html = `
                <div class="pure-detail-row ${detailIndex % 2 === 0 ? 'even-row' : 'odd-row'}" data-detail-index="${detailIndex}">
                    ${showOrder ? 
                        `<div class="prestation-order-pure">${globalOrderNumber}</div>` : 
                        '<div class="prestation-order-empty"></div>'}
                    <div class="prestation-label">Entrée bouteille:</div>
                    <div class="prestation-value">${this.sanitizeInput(detail.category || 'Aucune')}</div>
                    <div class="prestation-value">${this.sanitizeInput(detail.name || '-')}</div>
                    <div class="prestation-qty">${detail.qty || '-'}</div>
                    <div class="prestation-price">${detail.price ? `${detail.price}€` : '-'}</div>
                    <div class="prestation-max" data-tooltip="${this.sanitizeInput(maxEntriesText)}">${this.sanitizeInput(maxEntriesText)}</div>
                    <div class="prestation-discount">${detail.discount ? `${detail.discount}€` : '-'}</div>
                    <div class="button-container">
                        ${showButtons ? `
                            <button class="edit-btn" aria-label="Éditer la prestation" data-id="${prestation.id}">✏️</button>
                            <button class="delete-btn" aria-label="Supprimer la prestation" data-id="${prestation.id}">🗑️</button>
                        ` : ''}
                    </div>
                </div>
            `;
            
            return html;
        }).join('');

        pureItem.innerHTML = detailRows;
        this.pureList.appendChild(pureItem);
        this.addDragEvents(pureItem);
    });
}
    getVisiblePurePrestations() {
        const filteredPrestations = this.selectedDayFilter 
            ? this.prestations.filter(p => p.days && p.days.includes(this.selectedDayFilter)) 
            : [...this.prestations];
        
        return filteredPrestations.filter(p => p.pureItems && p.pureItems.length > 0);
    }

    formatMaxEntries(maxEntries) {
        try {
            return Object.entries(maxEntries || {})
                .map(([qty, max]) => `${qty}=${max}`)
                .join(', ') || '-';
        } catch (error) {
            return '-';
        }
    }

    attachPrestationEvents() {
        document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        // On récupère le bouton, même si on clique sur l'icône à l'intérieur
        const button = e.currentTarget; 
        const id = button.dataset.id; // On récupère l'ID
        if (id) {
            this.editPrestation(id); // On passe l'ID à la fonction
        }
    });
});

        document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
        const id = e.target.dataset.id; // ✅ Utiliser l'ID au lieu de l'index
        const confirmed = await this.showCustomConfirm('Êtes-vous sûr de vouloir supprimer cette prestation ?');
        if (confirmed) {
            await this.deleteDataById(id); // ✅ Nouvelle fonction
        }
    });
});

        document.querySelectorAll('.prestation-max[data-tooltip]').forEach(element => {
            if (element.scrollWidth > element.clientWidth) {
                element.addEventListener('mouseenter', (e) => this.showTooltip(e, element));
                element.addEventListener('mouseleave', () => this.hideTooltip());
                element.addEventListener('mousemove', (e) => this.positionTooltip(e, element));
            }
        });
    }

    // --- ÉDITION ---

    editPrestation(id) {
    // On utilise find() pour trouver la prestation avec le bon ID dans la liste complète
    const prestation = this.prestations.find(p => p.id == id); 
    if (!prestation) {
        console.error("Prestation non trouvée avec l'ID:", id);
        return;
    }
    // Le reste de votre code ne change pas
    this.editingPrestationId = prestation.id;

    document.querySelectorAll('input[name="days"]').forEach(checkbox => {
        checkbox.checked = prestation.days && prestation.days.includes(checkbox.value);
    });
    this.accessPresentationLow.value = prestation.presentationLow || '';
    this.accessPresentationNormal.value = prestation.presentationNormal || '';
    this.accessPresentationAlcohol.value = prestation.presentationAlcohol || '';
    this.accessPresentationSoft.value = prestation.presentationSoft || '';
    this.accessPrice.value = prestation.price || '';
    this.accessSex.value = prestation.sex || 'H/F';
    this.pureContainer.innerHTML = '';
    if (prestation.pureItems && prestation.pureItems.length > 0) {
        prestation.pureItems.forEach(pure => {
            this.loadPureItem(pure);
        });
    }
    if (this.pureContainer.children.length === 0) {
        this.addPure();
    }

    this.accessList.style.opacity = '0.5';
    this.pureList.style.opacity = '0.5';
    
    const formElement = document.getElementById('access-form');
    if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}
  
    loadPureItem(pure) {
    const pureDiv = document.createElement('div');
    pureDiv.className = 'pure-row';

    const firstDetail = pure.details[0] || { 
        category: '', 
        name: '', 
        qty: '', 
        price: '', 
        maxEntries: { 1: 1 }, 
        discount: 0 
    };
    const additionalDetails = pure.details.slice(1);

    const maxEntriesText = this.formatMaxEntries(firstDetail.maxEntries);

    pureDiv.innerHTML = `
        <div class="category-section">
            <div>
                <label>Catégorie de bouteille (optionnel)</label>
                <input type="text" list="bottle-categories" value="${this.sanitizeInput(firstDetail.category)}" 
                       placeholder="Saisir ou sélectionner une catégorie" class="pure-category-input">
                <datalist id="bottle-categories">
                    <option value="VODKA"><option value="WHISKY"><option value="RUM">
                    <option value="JÄGERBOMB"><option value="TEQUILA"><option value="COGNAC">
                    <option value="CHAMPAGNE">
                </datalist>
            </div>
        </div>
        <div class="details-section">
            <div class="name-section">
                <div>
                    <label>Nom</label>
                    <input type="text" value="${this.sanitizeInput(firstDetail.name)}" class="pure-name">
                </div>
                <input type="hidden" class="pure-qty" value="${firstDetail.qty}">
                <div>
                    <label>Prix</label>
                    <input type="number" step="0.01" min="0" value="${firstDetail.price}" class="pure-price">
                </div>
                <div>
                    <label>Max. Entrée</label>
                    <input type="text" value="${maxEntriesText}" class="pure-max-entries" readonly 
                           data-max-entries='${JSON.stringify(firstDetail.maxEntries)}'>
                </div>
                <div>
                    <label>Réduc. bouteille suppl.</label>
                    <input type="number" step="0.01" min="0" value="${firstDetail.discount}" class="pure-discount">
                </div>
                <div class="pure-row-actions">
                    <div class="move-buttons-group">
                        <button type="button" class="detail-move-btn" data-direction="up" aria-label="Monter">▲</button>
                        <button type="button" class="detail-move-btn" data-direction="down" aria-label="Descendre">▼</button>
                    </div>
                    <div class="action-buttons-group">
                        <button type="button" class="pure-duplicate-btn" aria-label="Dupliquer la formule">📋</button>
                        <button type="button" class="pure-delete-btn" aria-label="Supprimer la formule">🗑️</button>
                    </div>
                </div>
            </div>
            
            ${additionalDetails.map(detail => {
                const detailMaxText = this.formatMaxEntries(detail.maxEntries);
                return `
                <div class="details-row">
                    <div><label>Nom</label><input type="text" value="${this.sanitizeInput(detail.name)}" class="pure-name"></div>
                    <input type="hidden" class="pure-qty" value="${detail.qty}">
                    <div><label>Prix</label><input type="number" step="0.01" min="0" value="${detail.price}" class="pure-price"></div>
                    <div><label>Max. Entrée</label><input type="text" value="${detailMaxText}" class="pure-max-entries" readonly data-max-entries='${JSON.stringify(detail.maxEntries)}'></div>
                    <div><label>Réduc. bouteille suppl.</label><input type="number" step="0.01" min="0" value="${detail.discount}" class="pure-discount"></div>
                    <div class="details-row-actions">
                        <div class="move-buttons-group">
                            <button type="button" class="detail-move-btn" data-direction="up" aria-label="Monter ce détail">▲</button>
                            <button type="button" class="detail-move-btn" data-direction="down" aria-label="Descendre ce détail">▼</button>
                        </div>
                        <div class="action-buttons-group">
                            <button type="button" class="delete-details-btn" aria-label="Supprimer les détails">🗑️</button>
                        </div>
                    </div>
                </div>
                `}).join('')}
            <button type="button" class="add-details-btn" aria-label="Ajouter des détails">+</button>
        </div>
    `;

    this.pureContainer.appendChild(pureDiv);
    this.bindPureEvents(pureDiv);

    // Lier les événements pour toutes les lignes de détails existantes
    pureDiv.querySelectorAll('.details-row').forEach(row => {
        const maxInput = row.querySelector('.pure-max-entries');
        const deleteBtn = row.querySelector('.delete-details-btn');
        
        if (maxInput) {
            maxInput.addEventListener('click', () => this.showMaxEntriesEditor(maxInput));
        }
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => this.deleteDetails(deleteBtn));
        }
        
        row.querySelectorAll('.detail-move-btn').forEach(btn => {
            btn.addEventListener('click', () => this.moveDetailItem(btn));
        });
    });
}

     filterByDay(day) {
        if (this.dashboardContainer) this.dashboardContainer.classList.remove('preview-active');
        const buttons = document.querySelectorAll('.day-btn');
        
        buttons.forEach(btn => btn.classList.remove('active'));
        
        if (this.previewBtn) {
            this.previewBtn.classList.remove('active');
        }

        this.selectedDayFilter = (this.selectedDayFilter === day) ? null : day;
        
        if (this.selectedDayFilter) {
            const activeBtn = Array.from(buttons).find(btn => btn.textContent.trim() === day);
            if (activeBtn) {
                activeBtn.classList.add('active');
            }
        }

        this.isPreviewActive = false;
        this.renderPrestations();
    }

    // --- FILTRAGE ET APERÇU ---

    showPreview() {
        if (!this.previewSection || !this.dashboardContainer) return; // Sécurité

        // Ajoute une classe au conteneur principal pour indiquer l'état "Aperçu"
        this.dashboardContainer.classList.add('preview-active');
       
        if (this.previewBtn) {
            this.previewBtn.classList.add('active');
        }

        const buttons = document.querySelectorAll('.day-btn');
        buttons.forEach(btn => btn.classList.remove('active'));
       
        this.selectedDayFilter = null;
        this.isPreviewActive = true;

        this.renderPreviewTable();
    }

    renderPreviewTable() {
    const daysOrder = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
    
    let html = `
        <table class="preview-table">
            <tr>
                <th>Jour</th>
                <th>Les entrées</th>
                <th>Prestation</th>
                <th>Catégorie</th>
                <th>Prix</th>
                <th>Sexe</th>
                <th>Qt. bouteilles</th>
                <th>Max. Entrée</th>
                <th>Réduc. bouteille suppl.</th>
            </tr>
    `;

    daysOrder.forEach((day) => {
        // ✅ Filtrer les prestations pour ce jour
        const dayPrestations = this.prestations.filter(p => p.days && p.days.includes(day));
        
        // ✅ NOUVEAU : Trier selon l'ordre défini pour ce jour
        dayPrestations.sort((a, b) => {
            const orderA = (a.dayOrders && a.dayOrders[day]) ?? 999999;
            const orderB = (b.dayOrders && b.dayOrders[day]) ?? 999999;
            return orderA - orderB;
        });
        
        const dayClass = `day-${day.toLowerCase()}`;

        if (dayPrestations.length > 0) {
            let allPresentationRows = [];
            let allPureRows = [];

            dayPrestations.forEach((prestation) => {
                // ... reste du code identique ...
                if (prestation.presentationLow) {
                    allPresentationRows.push({
                        access: 'Heure creuse',
                        prestation: prestation.presentationLow,
                        price: prestation.price ? `${prestation.price}€` : '',
                        sex: prestation.sex,
                        category: '', qty: '', maxEntries: '', discount: ''
                    });
                }
                if (prestation.presentationNormal) {
                    allPresentationRows.push({
                        access: 'Entrée sans Boisson',
                        prestation: prestation.presentationNormal,
                        price: prestation.price ? `${prestation.price}€` : '',
                        sex: prestation.sex,
                        category: '', qty: '', maxEntries: '', discount: ''
                    });
                }
                if (prestation.presentationAlcohol) {
                    allPresentationRows.push({
                        access: 'Entrée + Alcool',
                        prestation: prestation.presentationAlcohol,
                        price: prestation.price ? `${prestation.price}€` : '',
                        sex: prestation.sex,
                        category: '', qty: '', maxEntries: '', discount: ''
                    });
                }
                if (prestation.presentationSoft) {
                    allPresentationRows.push({
                        access: 'Entrée + Soft',
                        prestation: prestation.presentationSoft,
                        price: prestation.price ? `${prestation.price}€` : '',
                        sex: prestation.sex,
                        category: '', qty: '', maxEntries: '', discount: ''
                    });
                }

                if (prestation.pureItems) {
                    prestation.pureItems.forEach(pure => {
                        pure.details.forEach(detail => {
                            allPureRows.push({
                                access: 'Bouteille',
                                prestation: detail.name || '-',
                                price: detail.price ? `${detail.price}€` : '-',
                                sex: prestation.sex,
                                category: detail.category || '',
                                qty: detail.qty || '-',
                                maxEntries: this.formatMaxEntries(detail.maxEntries),
                                discount: detail.discount ? `${detail.discount}€` : ''
                            });
                        });
                    });
                }
            });

            const rowCount = allPresentationRows.length + allPureRows.length;
            let firstRowOfDay = true;

            [...allPresentationRows, ...allPureRows].forEach(row => {
                html += `
                    <tr class="${dayClass}">
                        ${firstRowOfDay ? `<td class="day-cell" rowspan="${rowCount}" onclick="gestionEntreesInstance.filterByDay('${day}')">${day}</td>` : ''}
                        <td>${this.sanitizeInput(row.access)}</td>
                        <td>${this.sanitizeInput(row.prestation)}</td>
                        <td>${this.sanitizeInput(row.category)}</td>
                        <td>${row.price}</td>
                        <td>${this.sanitizeInput(row.sex)}</td>
                        <td>${row.qty}</td>
                        <td>${this.sanitizeInput(row.maxEntries)}</td>
                        <td>${row.discount}</td>
                    </tr>
                `;
                firstRowOfDay = false;
            });
        } else {
            html += `
                <tr class="${dayClass}">
                    <td class="day-cell" onclick="gestionEntreesInstance.filterByDay('${day}')">${day}</td>
                    <td colspan="8">Aucune prestation</td>
                </tr>
            `;
        }
    });

    html += '</table>';
    this.previewSection.innerHTML = html;
}

    // --- UTILITAIRES ---

    resetForm() {
        document.querySelectorAll('input[name="days"]').forEach(checkbox => {
            checkbox.checked = false;
        });

        this.accessPresentationLow.value = '';
        this.accessPresentationNormal.value = '';
        this.accessPresentationAlcohol.value = '';
        this.accessPresentationSoft.value = '';
        this.accessPrice.value = '';
        this.accessSex.value = 'H/F';

        this.pureContainer.innerHTML = '';
        this.addPure();

        this.editingPrestationId = null; 
        if(this.accessList) this.accessList.style.opacity = '1';
        if(this.pureList) this.pureList.style.opacity = '1';

        document.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
    }

    sanitizeInput(input) {
        const div = document.createElement('div');
        div.textContent = input;
        return div.innerHTML;
    }

    // --- TOOLTIPS ---

    setupTooltips() {
        document.querySelectorAll('.tooltip-icon').forEach(icon => {
            icon.addEventListener('mouseenter', (e) => this.showTooltip(e, icon));
            icon.addEventListener('mouseleave', () => this.hideTooltip());
            icon.addEventListener('mousemove', (e) => this.positionTooltip(e, icon));
        });
    }

    showTooltip(e, element) {
        let tooltip = document.querySelector('.tooltip');
        
        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.className = 'tooltip';
            document.body.appendChild(tooltip);
        }

        const tooltipText = element.getAttribute('data-tooltip');
        tooltip.textContent = tooltipText;
        tooltip.classList.add('visible');
        
        this.positionTooltip(e, element);
    }

    hideTooltip() {
        const tooltip = document.querySelector('.tooltip');
        if (tooltip) {
            tooltip.classList.remove('visible');
        }
    }

    positionTooltip(e, element) {
        const tooltip = document.querySelector('.tooltip');
        if (!tooltip || !tooltip.classList.contains('visible')) return;

        const rect = element.getBoundingClientRect();
        const scrollX = window.pageXOffset;
        const scrollY = window.pageYOffset;

        let top = rect.bottom + scrollY + 5;
        let left = rect.left + scrollX + (rect.width / 2) - (tooltip.offsetWidth / 2);

        if (top + tooltip.offsetHeight > window.innerHeight + scrollY) {
            top = rect.top + scrollY - tooltip.offsetHeight - 5;
        }
        
        if (left < scrollX) {
            left = scrollX + 5;
        }
        
        if (left + tooltip.offsetWidth > window.innerWidth + scrollX) {
            left = window.innerWidth + scrollX - tooltip.offsetWidth - 5;
        }

        tooltip.style.top = `${top}px`;
        tooltip.style.left = `${left}px`;
    }

    // --- UI HELPERS ---

    showLoading(show) {
        const container = document.querySelector('.gestion-entrees .container');
        if (container) {
            if (show) {
                container.classList.add('loading');
            } else {
                container.classList.remove('loading');
            }
        }
    }

    showMessage(message, type = 'info') {
        const existingMessages = document.querySelectorAll('.message');
        existingMessages.forEach(msg => msg.remove());

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type === 'error' ? 'error-message' : 'success-message'}`;
        messageDiv.textContent = message;
        
        const container = document.querySelector('.gestion-entrees .container');
        if (container) {
            container.insertBefore(messageDiv, container.firstChild);
        }

        setTimeout(() => {
            messageDiv.remove();
        }, 5000);
    }
      showCustomConfirm(message) {
    return new Promise((resolve) => {
        const modal = document.getElementById('custom-confirmation-modal');
        const messageEl = document.getElementById('modal-message');
        const okBtn = document.getElementById('modal-button-ok');
        const cancelBtn = document.getElementById('modal-button-cancel');

        if (!modal || !okBtn || !cancelBtn) {
            console.error('Modale introuvable');
            resolve(false);
            return;
        }

        if (messageEl) messageEl.textContent = message;

        // Nettoyer les anciens listeners
        const newOkBtn = okBtn.cloneNode(true);
        const newCancelBtn = cancelBtn.cloneNode(true);
        okBtn.parentNode.replaceChild(newOkBtn, okBtn);
        cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

        // Afficher la modale
        modal.style.display = 'flex';
        modal.classList.add('show');

        const handleOk = () => {
            modal.classList.remove('show');
            modal.style.display = 'none';
            resolve(true);
        };

        const handleCancel = () => {
            modal.classList.remove('show');
            modal.style.display = 'none';
            resolve(false);
        };

        newOkBtn.addEventListener('click', handleOk);
        newCancelBtn.addEventListener('click', handleCancel);
    });
}
}
