// Gère l'affichage et les interactions de sélection des prestations

class KioskInterface2 {
    constructor() {
        this.prestations = [];
        this.kioskItems = {};
        this.token = localStorage.getItem('token');
        this.apiBaseUrl = '/api/entrees';
        
        // Éléments DOM du kiosque (seront capturés dans init())
        this.kioskContainer = null;
        this.kioskAccessContainer = null;
        this.kioskPureContainer = null;
        this.kioskAccessSection = null;
        this.kioskPureSection = null;
        this.kioskSeparator = null;
        this.kioskTotalDiscount = null;
        this.kioskTotalPrice = null;
        this.orderSummary = null;
        this.kioskCheckoutBtn = null;
    }

    async init() {
        console.log('🎯 [KioskInterface2] Initialisation');
        
        // Capturer les éléments DOM après montage
        this.kioskContainer = document.getElementById('kiosk-view');
        this.kioskAccessContainer = document.getElementById('access-items-kiosk');
        this.kioskPureContainer = document.getElementById('pure-items-kiosk');
        this.kioskAccessSection = document.getElementById('access-soiree-kiosk');
        this.kioskPureSection = document.getElementById('pure-soiree-kiosk');
        this.kioskSeparator = document.getElementById('kiosk-separator');
        this.kioskTotalDiscount = document.getElementById('kiosk-total-discount');
        this.kioskTotalPrice = document.getElementById('kiosk-total-price');
        this.orderSummary = document.getElementById('kiosk-order-summary');
        this.kioskCheckoutBtn = document.getElementById('validate-kiosk-btn') || 
                               document.getElementById('kiosk-checkout-btn');
        
const canvas = document.getElementById('canvas');
        if (canvas) {
            console.log('🖼️ [KioskInterface2] Canvas détecté et ajusté pour uniformité');
        }

        await this.loadPrestations();
        await this.updateKioskHeader();
        this.renderKioskItems();
        this.attachEventListeners();
    }

    async refresh() {
        console.log('🔄 [KioskInterface2] Rafraîchissement');
        await this.loadPrestations();
        this.renderKioskItems();
    }

    // === CHARGEMENT DES DONNÉES ===

    async loadPrestations() {
        if (!this.token) {
            console.warn('⚠️ [KioskInterface2] Aucun token disponible');
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
            
            console.log('✅ [KioskInterface2] Prestations chargées:', this.prestations.length);
        } catch (error) {
            console.error('❌ [KioskInterface2] Erreur chargement:', error);
            this.prestations = [];
        }
    }

    // === HEADER DU KIOSQUE ===

    async getDiscoName() {
        try {
            const response = await fetch('/api/profile', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                return data.discoName || 'Nom de la discothèque';
            }
        } catch (error) {
            console.error('❌ [KioskInterface2] Erreur récupération nom:', error);
        }
        return 'Nom de la discothèque';
    }

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

    async updateKioskHeader() {
        const kioskHeader = this.kioskContainer?.querySelector('.kiosk-header');
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

    // === RENDU DES ITEMS ===

    renderKioskItems() {
        if (!this.kioskContainer) return;

        this.kioskAccessContainer.innerHTML = '';
        this.kioskPureContainer.innerHTML = '';
        this.kioskItems = {};

        const today = new Date();
        const daysOfWeek = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
        const currentDay = daysOfWeek[today.getDay()];

        console.log(`📅 [KioskInterface2] Jour actuel: ${currentDay}`);

        // ✅ Filtrer par jour actuel
        let todayPrestations = this.prestations.filter(p => p.days && p.days.includes(currentDay));
        
        // ✅ Trier selon l'ordre du jour actuel (dayOrders)
        todayPrestations.sort((a, b) => {
            const orderA = (a.dayOrders && a.dayOrders[currentDay]) ?? 999999;
            const orderB = (b.dayOrders && b.dayOrders[currentDay]) ?? 999999;
            return orderA - orderB;
        });

        console.log(`🔢 [KioskInterface2] Prestations filtrées: ${todayPrestations.length}`);

        let hasAccess = false;
        let hasPure = false;

        // === RENDU "ACCÈS SOIRÉE" ===
        todayPrestations.forEach((prestation, prestationIndex) => {
            if (this.hasAccessData(prestation)) {
                hasAccess = true;
                const price = parseFloat(prestation.price) || 0;
                
                ['Low', 'Normal', 'Alcohol', 'Soft'].forEach(type => {
                    const presentationName = prestation[`presentation${type}`];
                    if (presentationName) {
                        const id = `access-${type.toLowerCase()}-${prestationIndex}`;
                        this.kioskItems[id] = { 
                            name: presentationName, 
                            price, 
                            qty: 0, 
                            maxQty: 10 
                        };
                        this.kioskAccessContainer.innerHTML += this.createKioskItemHTML(id, presentationName, price);
                    }
                });
            }
        });

        // === RENDU "PURE SOIRÉE" AVEC CATÉGORIES ===
        const pureItemsGrouped = {};

        todayPrestations.forEach((prestation, prestationIndex) => {
            if (prestation.pureItems && prestation.pureItems.length > 0) {
                hasPure = true;
                prestation.pureItems.forEach((pure, pureIndex) => {
                    pure.details.forEach((detail, detailIndex) => {
                        const category = detail.category || '';
                        if (!pureItemsGrouped[category]) {
                            pureItemsGrouped[category] = [];
                        }

                        const id = `pure-${prestationIndex}-${pureIndex}-${detailIndex}`;
                        pureItemsGrouped[category].push({ id, detail });

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

        // Construire le HTML des catégories Pure Soirée
        if (hasPure) {
            let pureHtml = '';
            for (const category in pureItemsGrouped) {
                if (category && category.trim() !== '') {
                    pureHtml += `<div class="kiosk-item"><div class="kiosk-item-category">${this.sanitizeInput(category)}</div></div>`;
                }
                
                pureItemsGrouped[category].forEach(item => {
                    pureHtml += this.createKioskItemHTML(item.id, item.detail.name, item.detail.price, item.detail.maxEntries);
                });
            }
            this.kioskPureContainer.innerHTML = pureHtml;
        }

        // === GESTION DE LA VISIBILITÉ ===
        if (this.kioskAccessSection) {
            this.kioskAccessSection.style.display = hasAccess ? 'block' : 'none';
        }
        if (this.kioskPureSection) {
            this.kioskPureSection.style.display = hasPure ? 'block' : 'none';
        }
        if (this.kioskSeparator) {
            this.kioskSeparator.style.display = (hasAccess && hasPure) ? 'block' : 'none';
        }

        this.attachQuantityListeners();
        this.updateKioskTotal();

        console.log('✅ [KioskInterface2] Rendu terminé');
    }

    hasAccessData(prestation) {
        return prestation.presentationLow || 
               prestation.presentationNormal || 
               prestation.presentationAlcohol || 
               prestation.presentationSoft || 
               prestation.price;
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

    // === GESTION DES QUANTITÉS ===

    attachQuantityListeners() {
        this.kioskContainer.querySelectorAll('.kiosk-qty-btn').forEach(button => {
            button.replaceWith(button.cloneNode(true));
        });
        
        this.kioskContainer.querySelectorAll('.kiosk-qty-btn').forEach(button => {
            button.addEventListener('click', (event) => this.handleQuantityClick(event));
        });
    }

    handleQuantityClick(event) {
        const button = event.currentTarget;
        const id = button.dataset.id;
        const action = button.dataset.action;
        this.updateQuantity(id, action === 'increase' ? 1 : -1);
    }

    updateQuantity(itemId, change) {
        if (!this.kioskItems[itemId]) return;
        
        const item = this.kioskItems[itemId];
        const newQty = item.qty + change;

        if (newQty >= 0 && newQty <= (item.maxQty || 10)) {
            item.qty = newQty;
            
            const qtyElement = document.getElementById(`${itemId}-qty`);
            if (qtyElement) {
                qtyElement.textContent = newQty;
            }
            
            // Mise à jour Max. Entrées si applicable
            if (item.maxEntries) {
                item.currentMaxEntries = item.maxEntries[newQty] || item.currentMaxEntries;
                const maxEntriesElement = document.getElementById(`${itemId}-max-entries`);
                if (maxEntriesElement) {
                    const maxValueSpan = maxEntriesElement.querySelector('.kiosk-max-value');
                    if (maxValueSpan) {
                        maxValueSpan.textContent = item.currentMaxEntries || 0;
                    }
                }
            }
            
            this.updateKioskTotal();
        }
    }

    // === MISE À JOUR DU TOTAL ===

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
        if (this.orderSummary) {
            if (orderHTML) {
                this.orderSummary.innerHTML = orderHTML;
            } else {
                this.orderSummary.innerHTML = '<div class="order-empty">Aucun article sélectionné</div>';
            }
        }
        
        // Mise à jour du total
        if (this.kioskTotalPrice) {
            this.kioskTotalPrice.textContent = `${(total - discountTotal).toFixed(2)}€`;
        }
        
        // Mise à jour de la réduction
        if (this.kioskTotalDiscount) {
            this.kioskTotalDiscount.textContent = discountTotal > 0 ? 
                `(Réduc. bouteille suppl.: -${discountTotal.toFixed(2)}€)` : '';
        }
        
        // Mise à jour du bouton validation
        if (this.kioskCheckoutBtn) {
            this.kioskCheckoutBtn.disabled = itemCount === 0;
            
            // Mise à jour du texte avec le nombre de personnes
            const nombrePersonnes = parseInt(localStorage.getItem('kioskGroupSize')) || 1;
            const personneText = nombrePersonnes === 1 ? 'PERSONNE' : 'PERSONNES';
            this.kioskCheckoutBtn.textContent = `VALIDER POUR ${nombrePersonnes} ${personneText}`;
        }
    }

    // === ÉVÉNEMENTS ===

    attachEventListeners() {
        // Bouton retour vers le tableau de bord
        const toggleBackBtn = document.getElementById('toggle-back-btn');
        if (toggleBackBtn) {
            toggleBackBtn.addEventListener('click', () => {
                console.log('🔙 [KioskInterface2] Retour admin');
                if (typeof window.showSection === 'function') {
                    window.showSection('gestion-tickets-entree');
                }
            });
        }

        // ✅ FIX CRITIQUE : Bouton validation du panier
        if (this.kioskCheckoutBtn) {
            this.kioskCheckoutBtn.addEventListener('click', () => {
                const orderData = this.getOrderData();
                console.log('🛒 [KioskInterface2] Panier validé:', orderData);

                // ⚡ Vérifier qu'il y a au moins 1 article
                if (orderData.items.length === 0) {
                    console.warn('⚠️ [KioskInterface2] Panier vide - validation bloquée');
                    return;
                }

                // Anti-fraude : Vérifier nombre d'entrées >= nombre de personnes
                const nombrePersonnes = parseInt(localStorage.getItem('kioskGroupSize')) || 1;
                if (orderData.totalEntrees < nombrePersonnes) {
                    console.warn(`🚫 [KioskInterface2] Anti-fraude: ${orderData.totalEntrees} entrées < ${nombrePersonnes} personnes`);
                    
                    // Utiliser le système existant dans interface-app.js
                    const event = new CustomEvent('validateKioskOrder', { 
                        detail: orderData 
                    });
                    document.dispatchEvent(event);
                    return; // L'event handler dans interface-app.js gère l'erreur
                }

                // ✅ Validation OK - Stockage + navigation
                localStorage.setItem('kioskCart', JSON.stringify(orderData.items));
                localStorage.setItem('kioskTotalEntrees', orderData.totalEntrees);
                localStorage.setItem('kioskTotalPrice', orderData.totalPrice);
                
                console.log('✅ [KioskInterface2] Données stockées:', {
                    items: orderData.items.length,
                    entrees: orderData.totalEntrees,
                    prix: orderData.totalPrice
                });
                
                if (typeof window.showSection === 'function') {
                    window.showSection('vestiaire-selection');
                }
            });
        } else {
            console.error('❌ [KioskInterface2] Bouton validation introuvable !');
        }
    }

    // === UTILITAIRES ===

    sanitizeInput(input) {
        if (!input) return '';
        const div = document.createElement('div');
        div.textContent = input;
        return div.innerHTML;
    }

    // === DONNÉES POUR VALIDATION ===

    getOrderData() {
        const items = [];
        let totalEntrees = 0;
        
        for (const [id, item] of Object.entries(this.kioskItems)) {
            if (item.qty > 0) {
                items.push({
                    id,
                    name: item.name,
                    price: item.price,
                    qty: item.qty,
                    category: item.category || 'access',
                    maxEntries: item.currentMaxEntries || 0
                });
                
                // Compter les entrées
                if (item.currentMaxEntries) {
                    totalEntrees += item.currentMaxEntries * item.qty;
                } else {
                    totalEntrees += item.qty;
                }
            }
        }
        
        return {
            items,
            totalEntrees,
            totalPrice: parseFloat(this.kioskTotalPrice?.textContent) || 0
        };
    }
}

// ❌ REDONDANCE SUPPRIMÉE (gérée par interface-app.js)
// window.KioskInterface2 = KioskInterface2;

console.log('✅ [KioskInterface2] Classe chargée');
