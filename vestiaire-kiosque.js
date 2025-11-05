class VestiaireKiosque {
    constructor() {
        this.articles = [];
        this.selections = {}; // {articleId: quantite}
        this.apiUrl = '/api/vestiaires';
    }

    async init() {
        console.log('🎫 Initialisation Vestiaire Kiosque');
        await this.loadArticles();
        this.attachEventListeners();
    }

    async loadArticles() {
        try {
            const token = localStorage.getItem('token');
            
            if (!token) {
                console.error('Token manquant');
                return;
            }

            const response = await fetch(`${this.apiUrl}/articles`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Erreur ${response.status}`);
            }

            const data = await response.json();
            this.articles = data.articles || [];
            
            // Initialiser les sélections à 0
            this.selections = {};
            this.articles.forEach(article => {
                this.selections[article.id] = 0;
            });

            this.renderArticles();

        } catch (error) {
            console.error('❌ Erreur chargement articles vestiaire:', error);
        }
    }

    renderArticles() {
        const container = document.getElementById('vestiaires-kiosque-content');
        if (!container) return;

        if (this.articles.length === 0) {
            container.innerHTML = '<div class="empty-message">Aucun article de vestiaire disponible</div>';
            return;
        }

        container.innerHTML = '';

        this.articles.forEach(article => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'kiosque-item';
            
            itemDiv.innerHTML = `
                <div class="kiosque-item-name">${this.escapeHtml(article.nom)}</div>
                <div class="kiosque-item-price">${parseFloat(article.prix).toFixed(2)}€</div>
                <div class="kiosque-quantity-control">
                    <button class="kiosque-qty-btn" data-id="${article.id}" data-action="decrease">−</button>
                    <div class="kiosque-qty-value" id="qty-${article.id}">0</div>
                    <button class="kiosque-qty-btn" data-id="${article.id}" data-action="increase">+</button>
                </div>
            `;
            
            container.appendChild(itemDiv);
        });

        this.attachQuantityListeners();
    }

    attachQuantityListeners() {
        document.querySelectorAll('.kiosque-qty-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const articleId = e.target.dataset.id;
                const action = e.target.dataset.action;
                
                if (action === 'increase') {
                    this.selections[articleId]++;
                } else if (action === 'decrease' && this.selections[articleId] > 0) {
                    this.selections[articleId]--;
                }

                this.updateDisplay(articleId);
                this.updateTotal();
            });
        });
    }

    attachEventListeners() {
        const validateBtn = document.getElementById('validate-vestiaires-btn');
        const skipBtn = document.getElementById('skip-vestiaires-btn');

        if (validateBtn) {
            validateBtn.addEventListener('click', () => this.validateSelection());
        }

        if (skipBtn) {
            skipBtn.addEventListener('click', () => this.skipVestiaire());
        }
    }

    updateDisplay(articleId) {
        const qtyElement = document.getElementById(`qty-${articleId}`);
        if (qtyElement) {
            qtyElement.textContent = this.selections[articleId];
        }
    }

    updateTotal() {
        let total = 0;
        let hasSelection = false;

        this.articles.forEach(article => {
            const qty = this.selections[article.id] || 0;
            if (qty > 0) {
                hasSelection = true;
                total += qty * parseFloat(article.prix);
            }
        });

        const totalElement = document.getElementById('vestiaire-total');
        const validateBtn = document.getElementById('validate-vestiaires-btn');

        if (totalElement) {
            totalElement.textContent = `${total.toFixed(2)}€`;
        }

        if (validateBtn) {
            validateBtn.disabled = !hasSelection;
        }
    }

    validateSelection() {
        // Récupérer les articles sélectionnés
        const selectedArticles = [];
        
        this.articles.forEach(article => {
            const qty = this.selections[article.id];
            if (qty > 0) {
                selectedArticles.push({
                    id: article.id,
                    nom: article.nom,
                    quantite: qty,
                    prix_unitaire: parseFloat(article.prix)
                });
            }
        });

        if (selectedArticles.length === 0) {
            return;
        }

        // Stocker la sélection pour utilisation ultérieure (lors du paiement)
        sessionStorage.setItem('vestiaire_selection', JSON.stringify(selectedArticles));

        // Calculer le total
        const total = selectedArticles.reduce((sum, item) => {
            return sum + (item.quantite * item.prix_unitaire);
        }, 0);

        sessionStorage.setItem('vestiaire_total', total.toFixed(2));

        console.log('✅ Sélection vestiaire validée:', selectedArticles);

        // Déclencher un événement personnalisé
        document.dispatchEvent(new CustomEvent('vestiaireValidated', {
            detail: {
                articles: selectedArticles,
                total: total
            }
        }));

        // Passer à l'étape suivante (paiement ou autre)
        this.goToNextStep();
    }

    skipVestiaire() {
        // Réinitialiser les sélections
        Object.keys(this.selections).forEach(key => {
            this.selections[key] = 0;
        });

        // Nettoyer le sessionStorage
        sessionStorage.removeItem('vestiaire_selection');
        sessionStorage.removeItem('vestiaire_total');

        console.log('⏭️ Vestiaire ignoré');

        // Déclencher un événement
        document.dispatchEvent(new CustomEvent('vestiaireSkipped'));

        // Passer à l'étape suivante
        this.goToNextStep();
    }

    goToNextStep() {
        // Masquer l'étape vestiaire
        const vestiaireSection = document.getElementById('vestiaire-selection');
        if (vestiaireSection) {
            vestiaireSection.style.display = 'none';
        }

        // Afficher l'étape suivante (à définir selon votre flux)
        // Par exemple : paiement, récapitulatif, etc.
        const nextStep = document.getElementById('paiement-step');
        if (nextStep) {
            nextStep.style.display = 'block';
        }
    }

    resetSelections() {
        Object.keys(this.selections).forEach(key => {
            this.selections[key] = 0;
            this.updateDisplay(key);
        });
        this.updateTotal();
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Fonction d'initialisation
window.initVestiaireKiosque = function() {
    if (!window.vestiaireKiosqueInstance) {
        window.vestiaireKiosqueInstance = new VestiaireKiosque();
        vestiaireKiosqueInstance.init();
    } else {
        vestiaireKiosqueInstance.loadArticles();
    }
};

// Fonction pour obtenir l'instance
window.getVestiaireKiosqueInstance = function() {
    return vestiaireKiosqueInstance;
};
