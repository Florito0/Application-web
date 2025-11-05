class ConfigurationManager {
    constructor() {
        this.saveKiosqueButton = document.getElementById('saveKiosqueSettings');
        this.addTaxBtn = document.querySelector('#configuration-taxes .add-tax-btn');
        this.taxListContainer = document.querySelector('#configuration-taxes .tax-rates');
        this.saveTaxButton = document.getElementById('saveTaxSettingsBtn');
        this.taxes = []; // Stockage des taxes chargées

      // --- NOUVEAU : Suivi des changements en attente ---
        this.stagedAdditions = []; // Taxes à ajouter
        this.stagedDeletions = []; // ID des taxes à supprimer  
        
        // Nouveaux éléments pour le formulaire d'ajout
        this.addTaxFormContainer = document.getElementById('add-tax-form-container');
        this.newTaxInput = document.getElementById('new-tax-input');
        this.confirmAddTaxBtn = document.getElementById('confirm-add-tax-btn');
        this.cancelAddTaxBtn = document.getElementById('cancel-add-tax-btn');
        
        this.alerts = {
            1: {
                enabled: document.getElementById('alert1-enabled'),
                percentage: document.getElementById('alert1-percentage'),
                color: document.getElementById('alert1-color'),
                visual: document.getElementById('alert1-visual')
            },
            2: {
                enabled: document.getElementById('alert2-enabled'),
                percentage: document.getElementById('alert2-percentage'),
                color: document.getElementById('alert2-color'),
                visual: document.getElementById('alert2-visual')
            },
            3: {
                enabled: document.getElementById('alert3-enabled'),
                percentage: document.getElementById('alert3-percentage'),
                color: document.getElementById('alert3-color'),
                visual: document.getElementById('alert3-visual')
            }
        };

        // Configuration par défaut des alertes
        this.defaultAlertConfig = {
            1: { enabled: false, percentage: 80, color: '#00f708' },
            2: { enabled: false, percentage: 90, color: '#ff9800' },
            3: { enabled: false, percentage: 95, color: '#ff1100' }
        };
    }

    async resetAndReload() {
    console.log('🔄 Réinitialisation de l\'état des taxes...');
    // Vide les modifications qui n'ont pas été sauvegardées
    this.stagedAdditions = [];
    this.stagedDeletions = [];
    
    // Recharge les données propres depuis le serveur
    await this.loadInitialData();
}
    async init() {
        // Réinitialise l'état à chaque chargement de la section
        this.stagedAdditions = [];
        this.stagedDeletions = [];
        this.setupEventListeners();
        
        await this.loadInitialData();
        
        // S'exécute une seule fois si la base est vide pour la peupler
        if (this.taxes.length === 0) {
            await this.initializeDefaultTaxes();
            await this.loadTaxes(); 
        }
    }

    async initializeDefaultTaxes() {
        const defaultTaxes = [
            { nom: 'TVA 5.5%', taux: 5.5 },
            { nom: 'TVA 10%', taux: 10.0 },
            { nom: 'TVA 20%', taux: 20.0 }
        ];
        const token = localStorage.getItem('token');
        for (const taxe of defaultTaxes) {
            try {
                await fetch('/api/taxes', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify(taxe)
                });
            } catch (error) {
                console.error("Erreur lors de l'initialisation des taxes par défaut:", error);
            }
        }
    }
        
async loadInitialData() {
        await this.loadConfiguration();
        // await this.loadConfiguration(); // Décommentez si nécessaire pour les autres onglets
        await this.loadTaxes();
        // this.updateVisuals(); // Décommentez si nécessaire
        await this.loadTaxAssignments();
    }

setupEventListeners() {
    console.log('🔧 Setup des event listeners');

    Object.values(this.alerts).forEach(alert => {
        if (alert.color) {
            alert.color.addEventListener('input', () => {
                this.updateVisuals();
            });
        }
    });

    // DANS setupEventListeners()
    if (this.saveKiosqueButton) {
        // On retire un potentiel ancien écouteur pour éviter les doublons
        if (this.saveKiosqueButton._clickHandler) {
            this.saveKiosqueButton.removeEventListener('click', this.saveKiosqueButton._clickHandler);
        }

        // On définit notre nouvelle fonction de clic
        this.saveKiosqueButton._clickHandler = async (e) => {
            e.preventDefault();
            const confirmed = await this.showConfirmation('Souhaitez-vous enregistrer les paramètres ?');
            if (confirmed) {
                await this.saveKiosqueSettings();
            }
        };

        // On attache le nouvel écouteur unique
        this.saveKiosqueButton.addEventListener('click', this.saveKiosqueButton._clickHandler);
    }

    Object.values(this.alerts).forEach(currentAlert => {
        if (currentAlert.enabled) {
            currentAlert.enabled.addEventListener('change', (e) => {
                const isBeingEnabled = e.target.checked;

                // On ne fait la vérification que si on essaie d'activer l'alerte
                if (isBeingEnabled) {
                    const currentPercentage = currentAlert.percentage.value;
                    let isDuplicate = false;

                    // On vérifie toutes les AUTRES alertes
                    Object.values(this.alerts).forEach(otherAlert => {
                        // On s'assure que ce n'est pas l'alerte actuelle
                        if (currentAlert !== otherAlert) {
                            // Si une autre alerte est active ET a le même pourcentage
                            if (otherAlert.enabled.checked && otherAlert.percentage.value === currentPercentage) {
                                isDuplicate = true;
                            }
                        }
                    });

                    // Si un doublon a été trouvé
                    if (isDuplicate) {
    // On affiche un message d'erreur en popup centré
    this.showSuccessModal('Ce pourcentage est déjà utilisé par une autre alerte active.');
    
    // On annule l'activation de l'interrupteur
    e.target.checked = false;
                    }
                }
            });
        }
    });

    // 🆕 NETTOYER L'ANCIEN LISTENER DU BOUTON AJOUTER
    if (this.addTaxBtn && this.addTaxBtn._hasListener) {
        this.addTaxBtn.removeEventListener('click', this.addTaxBtn._clickHandler);
    }
    
    // ✅ BOUTON PRINCIPAL "Ajouter TVA"
    if (this.addTaxBtn) {
        this.addTaxBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.showAddTaxForm();
        });
    }
    
    // Listener pour le bouton "Ajouter" du petit formulaire
    if (this.confirmAddTaxBtn) {
        this.confirmAddTaxBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.confirmAddTaxe();
        });
    }

    // Listener pour le bouton "Annuler"
    if (this.cancelAddTaxBtn) {
        this.cancelAddTaxBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.hideAddTaxForm();
        });
    }
    
    // Listener pour le bouton principal "Enregistrer les paramètres"
    if (this.saveTaxButton) {
        // On retire un potentiel ancien écouteur pour éviter les doublons
        if (this.saveTaxButton._clickHandler) {
            this.saveTaxButton.removeEventListener('click', this.saveTaxButton._clickHandler);
        }

        // On définit notre nouvelle fonction de clic
        this.saveTaxButton._clickHandler = async (e) => { 
            e.preventDefault();
            const confirmed = await this.showConfirmation('Souhaitez-vous enregistrer les paramètres du kiosque ?');
            if (confirmed) {
                this.saveTaxSettings();
            }
        };

        // On attache le nouvel écouteur
        this.saveTaxButton.addEventListener('click', this.saveTaxButton._clickHandler);
    }
} // ✅ Fermeture correcte de setupEventListeners()

// 🆕 Gérer l'ajout avec le formulaire intégré - VERSION PROTÉGÉE
// 🎯 MÉTHODE 1 : Afficher le formulaire (simple)
async handleAddTaxe() {
    console.log('🔘 HandleAddTaxe appelé');
    this.showAddTaxForm();
}

// 🎯 MÉTHODE 2 : Afficher le formulaire
showAddTaxForm() {
    if (this.addTaxFormContainer) {
        this.addTaxFormContainer.style.display = 'block';
        this.newTaxInput.value = '';
        this.newTaxInput.focus();
    }
}

hideAddTaxForm() {
    if (this.addTaxFormContainer) {
        this.addTaxFormContainer.style.display = 'none';
    }
}

// 🎯 MÉTHODE 4 : Confirmer l'ajout (avec toute ta logique)
async confirmAddTaxe() {
    
    const tauxStr = this.newTaxInput.value.trim();
    if (!tauxStr) {
        return this.showAlert('Veuillez entrer un taux de TVA.', 'error');
    }
    const taux = parseFloat(tauxStr);
    if (isNaN(taux) || taux < 0 || taux > 100) {
        return this.showAlert('Le taux de TVA doit être un nombre entre 0 et 100.', 'error');
    }
    const tauxFormatted = taux % 1 === 0 ? Math.round(taux) : taux;
    const nom = `TVA ${tauxFormatted}%`;
    
    const existeDeja = this.taxes.some(t => parseFloat(t.taux) === parseFloat(taux));
    if (existeDeja) {
        return this.showAlert(`Le taux de TVA ${tauxFormatted}% est déjà dans la liste.`, 'error');
    }

    const newTaxObject = {
        id: `temp-${Date.now()}`,
        nom: nom,
        taux: taux,
        isNew: true,
        displayName: nom 
    };

    this.stagedAdditions.push(newTaxObject);
    this.taxes.push(newTaxObject);
    this.renderTaxes();
    this.hideAddTaxForm();
    this.showTaxStatusMessage('TVA ajoutée. Sauvegardez pour confirmer.');
}
    
    // Configuration des alertes - Version améliorée avec API
    applyConfiguration(config) {
        Object.keys(config).forEach(alertNum => {
            const alertConfig = config[alertNum];
            const alert = this.alerts[alertNum];
            
            if (alert) {
                if (alert.enabled && typeof alertConfig.enabled !== 'undefined') {
                    alert.enabled.checked = alertConfig.enabled;
                }
                if (alert.percentage && alertConfig.percentage) {
                    alert.percentage.value = alertConfig.percentage;
                }
                if (alert.color && alertConfig.color) {
                    alert.color.value = alertConfig.color;
                }
            }
        });
        
        this.updateVisuals();
        console.log('Configuration appliquée:', config);
    }

    async loadConfiguration() {
        try {
            // Essayer de charger depuis l'API d'abord
            const token = localStorage.getItem('token');
            const response = await fetch('/api/configuration', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            let config;
            if (response.ok) {
                const data = await response.json();
                config = data.alerts_config || this.defaultAlertConfig;
                console.log('Configuration chargée depuis l\'API:', config);
            } else {
                // Fallback localStorage
                const savedConfig = localStorage.getItem('kiosqueAlertConfig');
                config = savedConfig ? JSON.parse(savedConfig) : this.defaultAlertConfig;
                console.log('Configuration chargée depuis localStorage:', config);
            }

            this.applyConfiguration(config);
            
        } catch (error) {
            console.warn('Erreur lors du chargement de la configuration, utilisation des valeurs par défaut:', error);
            this.applyConfiguration(this.defaultAlertConfig);
        }
    }

    async saveKiosqueSettings() {
        try {
            const token = localStorage.getItem('token');
            const alertsConfig = {};

            // Collecte de la configuration
            Object.keys(this.alerts).forEach(alertNum => {
                const alert = this.alerts[alertNum];
                alertsConfig[alertNum] = {
                    enabled: alert.enabled ? alert.enabled.checked : false,
                    percentage: alert.percentage ? parseInt(alert.percentage.value) : this.defaultAlertConfig[alertNum].percentage,
                    color: alert.color ? alert.color.value : this.defaultAlertConfig[alertNum].color
                };
            });

            console.log('Configuration à sauvegarder:', alertsConfig);

            // Sauvegarde via API
            const response = await fetch('/api/configuration', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ alerts_config: alertsConfig })
            });

            if (response.ok) {
                console.log('Configuration sauvegardée via API');
            } else {
                // Fallback localStorage
                localStorage.setItem('kiosqueAlertConfig', JSON.stringify(alertsConfig));
                console.log('Configuration sauvegardée dans localStorage');
            }

            this.updateVisuals();
    // On remplace alert() par notre popup personnalisé
    this.showSuccessModal('Paramètres du kiosque sauvegardés avec succès !');

        } catch (error) {
            console.error('Erreur lors de la sauvegarde:', error);
            // Fallback localStorage en cas d'erreur
            try {
                const alertsConfig = {};
                Object.keys(this.alerts).forEach(alertNum => {
                    const alert = this.alerts[alertNum];
                    alertsConfig[alertNum] = {
                        enabled: alert.enabled ? alert.enabled.checked : false,
                        percentage: alert.percentage ? parseInt(alert.percentage.value) : this.defaultAlertConfig[alertNum].percentage,
                        color: alert.color ? alert.color.value : this.defaultAlertConfig[alertNum].color
                    };
                });
                localStorage.setItem('kiosqueAlertConfig', JSON.stringify(alertsConfig));
                alert('Paramètres sauvegardés localement');
            } catch (localError) {
                alert('Erreur lors de la sauvegarde des paramètres');
                console.error('Erreur localStorage:', localError);
            }
        }
    }

  updateVisuals() {
    Object.keys(this.alerts).forEach(alertNum => {
        const alert = this.alerts[alertNum];
        if (alert.visual && alert.color) {
            // Style original: fond sombre + bordure colorée
            alert.visual.style.backgroundColor = '#2a2a2a';
            alert.visual.style.borderColor = alert.color.value;
            alert.visual.style.border = `2px solid ${alert.color.value}`;
        }
    });
}

    async loadTaxes() {
        try {
            const response = await fetch('/api/taxes', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}`, 'Cache-Control': 'no-cache' }
            });
            if (!response.ok) throw new Error(`Erreur HTTP: ${response.status}`);
            this.taxes = await response.json();
            this.renderTaxes();
        } catch (error) {
            console.error('❌ Erreur lors du chargement des taxes:', error);
            this.taxes = [];
            this.renderTaxes();
        }
    }

// 🆕 AJOUTE CETTE MÉTHODE APRÈS loadTaxes()
 async loadTaxAssignments() {
        try {
            const response = await fetch('/api/configuration/tax-assignments', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (!response.ok) return;
            this.populateTaxSelects();

            const assignments = await response.json();
            assignments.forEach(assign => {
                document.querySelectorAll('.ticket-item, .vestiaire-item').forEach(item => {
                    const itemLabel = item.querySelector('span').textContent.trim();
                    if (itemLabel === assign.item_name) {
                        item.querySelector('select').value = assign.taxe_id;
                    }
                });
            });
        } catch (error) {
            console.error('❌ Erreur chargement assignations:', error);
        }
    }

renderTaxes() {
    if (!this.taxListContainer) return;
    this.taxListContainer.innerHTML = '';
    this.taxes.forEach(tax => {
        const taxElement = document.createElement('div');
        taxElement.className = 'tax-rate-item';
        const displayName = tax.displayName || `TVA ${tax.taux}%`;
        taxElement.innerHTML = `
            <span class="tax-name">${displayName}</span>
            <button class="delete-btn" data-tax-id="${tax.id}">
                <span class="icon trash"></span>
            </button>
        `;
        this.taxListContainer.appendChild(taxElement);
    });
    
    // On met à jour seulement les menus déroulants ici
    this.populateTaxSelects();
    this.setupTaxDeleteListeners();
}

setupTaxDeleteListeners() {
    if (!this.taxListContainer) return;
    if (this.taxListContainer._deleteListener) {
        this.taxListContainer.removeEventListener('click', this.taxListContainer._deleteListener);
    }

    const deleteListener = async (e) => {
        const deleteBtn = e.target.closest('.delete-btn');
        if (!deleteBtn) return;
        
        const taxId = deleteBtn.getAttribute('data-tax-id');
        const taxToDelete = this.taxes.find(t => String(t.id) === String(taxId));
        if (!taxToDelete) return;

        // ✅ Amélioration : Le message de confirmation est spécifique
        const confirmed = await this.showConfirmation(`Êtes-vous sûr de vouloir supprimer la TVA ${taxToDelete.taux}% ?`);
        
        if (confirmed) {
            // Étape 1 : Mettre la suppression en attente (logique interne)
            if (taxToDelete.isNew) {
                this.stagedAdditions = this.stagedAdditions.filter(t => String(t.id) !== String(taxId));
            } else {
                this.stagedDeletions.push(taxId);
            }

            // Étape 2 : Mettre à jour le tableau de données local
            this.taxes = this.taxes.filter(t => String(t.id) !== String(taxId));
            
            // Étape 3 : Suppression visuelle directe et garantie
            deleteBtn.closest('.tax-rate-item').remove();

            // Étape 4 : Mettre à jour les menus déroulants
            this.populateTaxSelects();
            
            // Étape 5 : Afficher le message de statut
            this.showTaxStatusMessage('Taxe marquée pour suppression. Sauvegardez pour confirmer.');
        }
    };
    
    this.taxListContainer._deleteListener = deleteListener;
    this.taxListContainer.addEventListener('click', deleteListener);
}

// NOUVELLE VERSION À COPIER-COLLER
async showConfirmation(message) {
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
        
        const newOkBtn = okBtn.cloneNode(true);
        const newCancelBtn = cancelBtn.cloneNode(true);
        okBtn.parentNode.replaceChild(newOkBtn, okBtn);
        cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
        
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

 // 🎯 MÉTHODE 1 : populateTaxSelects (CORRIGÉE)
   populateTaxSelects() {
    document.querySelectorAll('#configuration-taxes .ticket-item select, #configuration-taxes .vestiaire-item select').forEach(select => {
        const currentSelectedId = select.value;
        select.innerHTML = '<option value="">Choisir une TVA</option>';
        this.taxes.forEach(tax => {
            const option = document.createElement('option');
            option.value = tax.id; 
            option.textContent = tax.displayName || `TVA ${tax.taux}%`;
            if (currentSelectedId && String(currentSelectedId) === String(tax.id)) {
                option.selected = true;
            }
            select.appendChild(option);
        });
    });
}

// 🎯 MÉTHODE 2 : saveTaxSettings (NOUVELLE VERSION)
   async saveTaxSettings() {
    const token = localStorage.getItem('token');
    if (!token) return this.showAlert('Utilisateur non authentifié.', 'error');

    try {
        // Étape 1 & 2 : Gérer les suppressions et ajouts en attente
        for (const taxId of this.stagedDeletions) {
            await fetch(`/api/taxes/${taxId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
        }
        for (const newTax of this.stagedAdditions) {
            await fetch('/api/taxes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ nom: newTax.nom, taux: newTax.taux })
            });
        }

        // Étape 3 : Recharger les taxes pour avoir les ID corrects
        await this.loadTaxes();
        console.log('🔍 loadTaxes() appelée');

        // Étape 4 : Gérer les assignations avec la logique corrigée
        const assignments = [];
        document.querySelectorAll('#configuration-taxes .ticket-item select, #configuration-taxes .vestiaire-item select').forEach(select => {
            if (select.value) {
                const itemName = select.closest('.ticket-item, .vestiaire-item').querySelector('span').textContent.trim();
                const selectedTax = this.taxes.find(t => String(t.id) === select.value);
                if (selectedTax) {
                    assignments.push({ item_name: itemName, taxe_id: selectedTax.id });
                }
            }
        });

        if (assignments.length > 0) {
             await fetch('/api/configuration/tax-assignments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ assignments })
            });
        }

        this.showSuccessModal('Tous les paramètres de taxes ont été enregistrés avec succès !');
        
        this.stagedAdditions = [];
        this.stagedDeletions = [];
        await this.loadTaxAssignments(); 

    } catch (error) {
        this.showAlert(`Une erreur est survenue: ${error.message}`, 'error');
    }
}

    showSuccessMessage(message) {
        const existingAlert = document.querySelector('.tax-success-alert');
        if (existingAlert) {
            existingAlert.remove();
        }
        
        const alert = document.createElement('div');
        alert.className = 'tax-success-alert';
        alert.textContent = message;
        
        document.body.appendChild(alert);
        
        setTimeout(() => {
            alert.classList.add('fade-out');
            setTimeout(() => {
                if (alert.parentNode) {
                    alert.remove();
                }
            }, 300);
        }, 3000);
    }

    showSuccessModal(message) {
    const modal = document.createElement('div');
    modal.className = 'tax-confirmation-modal'; // On peut réutiliser le même style
    modal.innerHTML = `
        <div class="modal-content">
            <p>${message}</p>
            <div class="modal-buttons">
                <button class="btn-ok">OK</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    const okButton = modal.querySelector('.btn-ok');
    okButton.onclick = () => modal.remove();
    
    modal.onclick = (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    };
    okButton.focus(); // Met le focus sur le bouton OK
}

    showTaxStatusMessage(message) {
    const statusElement = document.getElementById('tax-status-message');
    if (!statusElement) return;

    // Annule le timer précédent si l'utilisateur clique rapidement
    if (this.statusMessageTimer) {
        clearTimeout(this.statusMessageTimer);
    }

    statusElement.textContent = message;
    statusElement.classList.add('visible');

    // Fait disparaître le message après 3 secondes
    this.statusMessageTimer = setTimeout(() => {
        statusElement.classList.remove('visible');
    }, 3000);
}

    // 🆕 AJOUTE CETTE MÉTHODE DANS TA CLASSE
showAlert(message, type = 'info') {
        const existingAlert = document.querySelector('.temp-alert');
        if (existingAlert) existingAlert.remove();
        const alert = document.createElement('div');
        alert.className = `temp-alert alert-${type}`;
        alert.textContent = message;
        document.body.appendChild(alert);
        setTimeout(() => { if (alert.parentNode) alert.remove(); }, 3000);
    }
}

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('configuration-taxes')) {
        window.configManager = new ConfigurationManager();
        window.configManager.init();
    }
});
