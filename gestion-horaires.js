// Fonctions utilitaires pour tooltips intelligentes
function getOptimalTooltipPosition(icon, tooltip) {
    const iconRect = icon.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const scrollY = window.scrollY;
    
    // Marges de sécurité
    const margin = 20;
    
    // Position par défaut : à droite
    let position = 'right';
    
    // Vérifier si le tooltip déborde à droite
    if (iconRect.right + tooltipRect.width + margin > viewportWidth) {
        // Essayer à gauche
        if (iconRect.left - tooltipRect.width - margin > 0) {
            position = 'left';
        } else {
            // Ni à droite ni à gauche, essayer en bas
            if (iconRect.bottom + tooltipRect.height + margin < viewportHeight + scrollY) {
                position = 'bottom';
            } else {
                // Sinon en haut
                position = 'top';
            }
        }
    }
    
    // Sur petit écran (mobile), forcer en bas
    if (viewportWidth <= 480) {
        position = 'bottom';
    }
    
    return position;
}

function positionTooltip(tooltip, position) {
    // Supprimer toutes les classes de position
    tooltip.classList.remove('tooltip-left', 'tooltip-top', 'tooltip-bottom');
    
    // Ajouter la classe de position appropriée
    if (position !== 'right') {
        tooltip.classList.add(`tooltip-${position}`);
    }
}

class GestionHoraires {
    constructor() {
        this.horaires = {};
        this.copiedHoraires = null;
        this.container = null;
        this.init();
    }

   getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
} 

async init() {
    console.log('🕐 Initialisation Gestion Horaires');
    
    // ✅ AJOUT : Vérifier si le token est présent
    const token = localStorage.getItem('token');
    if (!token) {
        console.error('❌ Token manquant pour les horaires');
        this.showAlert('Vous devez être connecté pour accéder aux horaires', 'error');
        return;
    }
    
    await this.loadHoraires();
    this.initializeForm();
    this.setupEventListeners();
}

    // Charger les horaires depuis l'API
    async loadHoraires() {
    try {
        console.log('📡 Chargement des horaires...');
        const response = await fetch('/api/horaires', {
            method: 'GET',
            headers: this.getAuthHeaders()
        });
        
        if (response.ok) {
            const data = await response.json(); // 📥 Tableau du serveur
            console.log('📥 Données reçues du serveur:', data);
            this.horaires = this.formatHorairesData(data); // 🔄 Conversion
            console.log('🔄 Données formatées:', this.horaires);
        } else {
            this.horaires = this.getDefaultHoraires();
        }
    } catch (error) {
        console.error('❌ Erreur lors du chargement des horaires:', error);
        this.horaires = this.getDefaultHoraires();
    }
}

    // Format par défaut des horaires
    getDefaultHoraires() {
        return {
            lundi: { slot1: {debut: '', fin: ''}, slot2: {debut: '', fin: ''} },
            mardi: { slot1: {debut: '', fin: ''}, slot2: {debut: '', fin: ''} },
            mercredi: { slot1: {debut: '', fin: ''}, slot2: {debut: '', fin: ''} },
            jeudi: { slot1: {debut: '', fin: ''}, slot2: {debut: '', fin: ''} },
            vendredi: { slot1: {debut: '', fin: ''}, slot2: {debut: '', fin: ''} },
            samedi: { slot1: {debut: '', fin: ''}, slot2: {debut: '', fin: ''} },
            dimanche: { slot1: {debut: '', fin: ''}, slot2: {debut: '', fin: ''} }
        };
    }

    // Formater les données de l'API
    formatHorairesData(dataArray) {
  const jours = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
  const formattedHoraires = {};

  // Init
  jours.forEach(jour => {
    formattedHoraires[jour] = {
      slot1: { debut: '', fin: '' },
      slot2: { debut: '', fin: '' }
    };
  });

  // Normalise "HH:MM:SS" -> "HH:MM"
  const toHHMM = (t) => (typeof t === 'string' ? t.slice(0,5) : t || '');

  dataArray.forEach(horaire => {
    const jour = String(horaire.jour_semaine || '').toLowerCase();
    const slot = Number(horaire.slot_numero);
    const slotKey = slot === 2 ? 'slot2' : 'slot1';

    if (formattedHoraires[jour]) {
      formattedHoraires[jour][slotKey] = {
        debut: toHHMM(horaire.heure_debut),
        fin:   toHHMM(horaire.heure_fin)
      };
    }
  });

  return formattedHoraires;
}

    // Initialiser le formulaire avec les données
    initializeForm() {
        if (!this.container) return;
        
        this.container.querySelectorAll('tbody tr').forEach(row => {
            const day = row.dataset.day;
            if (!this.horaires[day]) return;

            const slot1Debut = row.querySelector('.heure-debut-1');
            const slot1Fin = row.querySelector('.heure-fin-1');
            const slot2Debut = row.querySelector('.heure-debut-2');
            const slot2Fin = row.querySelector('.heure-fin-2');

            if (slot1Debut) slot1Debut.value = this.horaires[day].slot1.debut || '';
            if (slot1Fin) slot1Fin.value = this.horaires[day].slot1.fin || '';
            if (slot2Debut) slot2Debut.value = this.horaires[day].slot2.debut || '';
            if (slot2Fin) slot2Fin.value = this.horaires[day].slot2.fin || '';
        });
    }

    // Configurer les event listeners
    setupEventListeners() {
        if (!this.container) return;

        // Boutons copier
        this.container.querySelectorAll('.copy-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const day = e.target.getAttribute('data-day');
                const slot = e.target.getAttribute('data-slot');
                this.copyHoraires(day, slot);
            });
        });

        // Boutons coller
        this.container.querySelectorAll('.paste-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const day = e.target.getAttribute('data-day');
                const slot = e.target.getAttribute('data-slot');
                this.pasteHoraires(day, slot);
            });
        });

        // Boutons supprimer
this.container.querySelectorAll('.delete-btn').forEach(button => {
    button.addEventListener('click', (e) => {
        const day = e.target.closest('button').getAttribute('data-day');
        const slot = e.target.closest('button').getAttribute('data-slot');
        this.deleteHoraires(day, slot);
    });
});

        // Bouton sauvegarder
        const saveBtn = this.container.querySelector('#save-horaires-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveHoraires());
        }

        // Tooltips intelligentes
        this.setupTooltips();
    }

    // Copier les horaires
    copyHoraires(day, slot) {
        const row = this.container.querySelector(`tr[data-day="${day}"]`);
        if (!row) return;

        const debutInput = row.querySelector(`.heure-debut-${slot}`);
        const finInput = row.querySelector(`.heure-fin-${slot}`);

        if (!debutInput?.value || !finInput?.value) {
            this.showAlert('Veuillez d\'abord définir des horaires à copier.', 'error');
            return;
        }

        this.copiedHoraires = {
            debut: debutInput.value,
            fin: finInput.value
        };

        console.log(`Copié depuis ${day} slot ${slot}:`, this.copiedHoraires);
        this.showAlert(`Horaires de ${day} (Plage ${slot}) copiés !`, 'success');
    }

    // Coller les horaires
    pasteHoraires(day, slot) {
        if (!this.copiedHoraires) {
            this.showAlert('Aucun horaire copié. Veuillez copier un horaire d\'abord.', 'error');
            return;
        }

        const row = this.container.querySelector(`tr[data-day="${day}"]`);
        if (!row) return;

        const debutInput = row.querySelector(`.heure-debut-${slot}`);
        const finInput = row.querySelector(`.heure-fin-${slot}`);

        if (debutInput && finInput) {
            debutInput.value = this.copiedHoraires.debut;
            finInput.value = this.copiedHoraires.fin;

            // Mettre à jour l'objet horaires
            this.horaires[day][`slot${slot}`] = {
                debut: this.copiedHoraires.debut,
                fin: this.copiedHoraires.fin
            };

            this.showAlert(`Horaires collés à ${day} (Plage ${slot}) !`, 'success');
        }
    }

    updateHorairesFromForm() {
    const jours = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];
    const horaires = [];
    // on repart d'un état propre et on le remplira depuis le DOM
    const newState = this.getDefaultHoraires();

    jours.forEach(jour => {
        const row = this.container.querySelector(`tr[data-day="${jour}"]`);
        if (!row) return;

        // Slot 1
        const debut1 = row.querySelector('.heure-debut-1')?.value || null;
        const fin1   = row.querySelector('.heure-fin-1')?.value   || null;

        horaires.push({
            jour_semaine: jour,
            slot_numero: 1,
            heure_debut: (debut1 && fin1) ? debut1 : null,
            heure_fin:   (debut1 && fin1) ? fin1   : null
        });
        newState[jour].slot1 = { debut: debut1 || '', fin: fin1 || '' };

        // Slot 2
        const debut2 = row.querySelector('.heure-debut-2')?.value || null;
        const fin2   = row.querySelector('.heure-fin-2')?.value   || null;

        horaires.push({
            jour_semaine: jour,
            slot_numero: 2,
            heure_debut: (debut2 && fin2) ? debut2 : null,
            heure_fin:   (debut2 && fin2) ? fin2   : null
        });
        newState[jour].slot2 = { debut: debut2 || '', fin: fin2 || '' };
    });

    // Synchroniser l'état interne avant la validation
    this.horaires = newState;

    // Très important: ne pas faire de fetch ici
    return horaires;
}

async saveHoraires() {
    if (this.isSaving) return;
    this.isSaving = true;

    const confirmed = await this.showConfirmation('Souhaitez-vous enregistrer les modifications ?');
    if (!confirmed) { this.isSaving = false; return; }

    try {
        // 1) Récupérer les valeurs du DOM + synchroniser this.horaires
        const horairesPourAPI = this.updateHorairesFromForm(); // ← retourne bien un tableau maintenant
        if (!Array.isArray(horairesPourAPI)) {
            throw new Error("Collecte des horaires échouée.");
        }

        // 2) Validation (maintenant this.horaires correspond aux inputs)
        const jours = ['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche'];
        for (const day of jours) {
            const slot1 = this.horaires[day].slot1;
            const slot2 = this.horaires[day].slot2;

            const s1Valide = slot1.debut && slot1.fin;
            const s2Valide = slot2.debut && slot2.fin;

            if (s1Valide && !this.isTimeAfter(slot1.fin, slot1.debut)) {
                this.showAlert(`Erreur pour ${day} (Plage 1) : l'heure de fin doit être après le début.`, 'error');
                this.isSaving = false;
                return;
            }
            if (s2Valide && !this.isTimeAfter(slot2.fin, slot2.debut)) {
                this.showAlert(`Erreur pour ${day} (Plage 2) : l'heure de fin doit être après le début.`, 'error');
                this.isSaving = false;
                return;
            }
            if (s1Valide && s2Valide) {
                const debut1 = new Date(`1970-01-01T${slot1.debut}`);
                const fin1   = new Date(`1970-01-01T${slot1.fin}`);
                const debut2 = new Date(`1970-01-01T${slot2.debut}`);
                const fin2   = new Date(`1970-01-01T${slot2.fin}`);
                const chevauchement = Math.max(debut1, debut2) < Math.min(fin1, fin2);
                if (chevauchement) {
                    this.showAlert(`Erreur pour ${day} : les plages 1 et 2 se chevauchent.`, 'error');
                    this.isSaving = false;
                    return;
                }
            }
        }

        // 3) Envoi unique au backend avec auth
        console.log('📤 Payload horaires envoyée:', horairesPourAPI);
        const response = await fetch('/api/horaires', {
            method: 'POST',
            headers: this.getAuthHeaders(),
            body: JSON.stringify({ horaires: horairesPourAPI })
        });

        if (response.ok) {
            this.showAlert('Horaires sauvegardés avec succès!', 'success');
        } else {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Erreur lors de la sauvegarde côté serveur');
        }

    } catch (error) {
        console.error('❌ Erreur de sauvegarde:', error);
        this.showAlert(`Une erreur est survenue: ${error.message}`, 'error');
    } finally {
        this.isSaving = false;
    }
}

// NOUVELLE VERSION AMÉLIORÉE
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

    // Vérifier si time1 est après time2
    isTimeAfter(time1, time2) {
        return new Date(`2000-01-01 ${time1}`) > new Date(`2000-01-01 ${time2}`);
    }

    // VERSION AMÉLIORÉE : Configurer les tooltips intelligentes
    setupTooltips() {
        const tooltipIcons = this.container ? 
            this.container.querySelectorAll('.tooltip-icon') : 
            document.querySelectorAll('.tooltip-icon');
        
        tooltipIcons.forEach(icon => {
            const tooltipId = icon.getAttribute('data-tooltip');
            const tooltip = document.getElementById(`tooltip-${tooltipId}`);
            
            if (tooltip) {
                let timeoutId;
                
                // Mouseenter avec délai
                icon.addEventListener('mouseenter', () => {
                    clearTimeout(timeoutId);
                    
                    // Afficher le tooltip temporairement pour calculer sa taille
                    tooltip.style.visibility = 'hidden';
                    tooltip.classList.add('visible');
                    
                    // Calculer la meilleure position
                    const optimalPosition = getOptimalTooltipPosition(icon, tooltip);
                    positionTooltip(tooltip, optimalPosition);
                    
                    // Afficher avec animation
                    tooltip.style.visibility = 'visible';
                    tooltip.style.opacity = '0';
                    tooltip.style.transition = 'opacity 0.2s ease-in-out';
                    
                    requestAnimationFrame(() => {
                        tooltip.style.opacity = '1';
                    });
                });
                
                // Mouseleave avec délai pour éviter les clignotements
                icon.addEventListener('mouseleave', () => {
                    timeoutId = setTimeout(() => {
                        tooltip.style.opacity = '0';
                        setTimeout(() => {
                            if (tooltip.style.opacity === '0') {
                                tooltip.classList.remove('visible');
                                tooltip.style.transition = '';
                            }
                        }, 200);
                    }, 100);
                });
                
                // Garder le tooltip ouvert quand on survole le tooltip lui-même
                tooltip.addEventListener('mouseenter', () => {
                    clearTimeout(timeoutId);
                });
                
                tooltip.addEventListener('mouseleave', () => {
                    timeoutId = setTimeout(() => {
                        tooltip.style.opacity = '0';
                        setTimeout(() => {
                            if (tooltip.style.opacity === '0') {
                                tooltip.classList.remove('visible');
                                tooltip.style.transition = '';
                            }
                        }, 200);
                    }, 100);
                });
            }
        });
        
        // Recalculer les positions lors du redimensionnement
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                // Repositionner les tooltips visibles
                const visibleTooltips = document.querySelectorAll('.tooltip.visible');
                visibleTooltips.forEach(tooltip => {
                    const tooltipId = tooltip.id.replace('tooltip-', '');
                    const icon = document.querySelector(`[data-tooltip="${tooltipId}"]`);
                    if (icon) {
                        const optimalPosition = getOptimalTooltipPosition(icon, tooltip);
                        positionTooltip(tooltip, optimalPosition);
                    }
                });
            }, 150);
        });
    }

    // Définir le conteneur
    setContainer(container) {
        this.container = container;
        this.setupEventListeners();
        this.initializeForm();
    }

    // Afficher une alerte
    showAlert(message, type = 'info') {
        // Créer une alerte simple compatible avec ton système
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type}`;
        alertDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            z-index: 10000;
            font-weight: 500;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            transition: all 0.3s ease;
            max-width: 350px;
            transform: translateX(100%);
            opacity: 0;
        `;
        
        // Couleurs selon le type
        if (type === 'success') {
            alertDiv.style.background = 'linear-gradient(135deg, #4CAF50, #45a049)';
        } else if (type === 'error') {
            alertDiv.style.background = 'linear-gradient(135deg, #f44336, #da190b)';
        } else {
            alertDiv.style.background = 'linear-gradient(135deg, #2196F3, #1976D2)';
        }
        
        alertDiv.textContent = message;
        document.body.appendChild(alertDiv);
        
        // Animation d'entrée
        setTimeout(() => {
            alertDiv.style.transform = 'translateX(0)';
            alertDiv.style.opacity = '1';
        }, 100);
        
        // Suppression automatique
        setTimeout(() => {
            alertDiv.style.transform = 'translateX(100%)';
            alertDiv.style.opacity = '0';
            setTimeout(() => {
                if (alertDiv.parentNode) {
                    alertDiv.parentNode.removeChild(alertDiv);
                }
            }, 300);
        }, 3000);
    }

    // Cette méthode peut être supprimée car setupTooltips() fait maintenant tout
    initTooltips() {
        this.setupTooltips(); // Utilise la version améliorée
    }

    // Rendu du contenu HTML
    render() {
    return `
        <div class="horaires-container">
            <div class="section-header">
                <h2>Gestion des Horaires</h2>
                <p class="section-subtitle" style="text-align: center;">Définissez les plages horaires creuses pour chaque jour</p>
            </div>
                
            <div class="tarif-table">
                <table class="horaires-table">
                    <thead>
                        <tr>
                            <th>Jour</th>
                            <th>
                                Plage Horaire Creuse 1
                                <span class="tooltip-container">
                                    <span class="tooltip-icon" data-tooltip="creuse1">?</span>
                                    <div id="tooltip-creuse1" class="tooltip">Définissez la première plage horaire creuse (par exemple, heures de faible affluence où un tarif réduit s'applique).</div>
                                </span>
                            </th>
                            <th>
                                Plage Horaire Creuse 2
                                <span class="tooltip-container">
                                    <span class="tooltip-icon" data-tooltip="creuse2">?</span>
                                    <div id="tooltip-creuse2" class="tooltip">Définissez la seconde plage horaire creuse (optionnelle, pour une autre période de la journée).</div>
                                </span>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.renderDayRows()}
                    </tbody>
                </table>
                
                <button id="save-horaires-btn" class="save-btn">
                    Sauvegarder les Horaires
                </button>
            </div>
        </div>
    `;
}

// Rendu des lignes de jours
renderDayRows() {
    const jours = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
    const jourLabels = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
    
    return jours.map((jour, index) => `
        <tr data-day="${jour}">
            <td>${jourLabels[index]}</td>
            <td>
                <div class="time-inputs-wrapper">
                    <div class="time-slot-group">
                        <input type="time" class="heure-debut-1" aria-label="Début heures creuses 1">
                        <span class="time-separator">-</span>
                        <input type="time" class="heure-fin-1" aria-label="Fin heures creuses 1">
                    </div>
                    <div class="action-buttons">
                        <button class="btn-copy copy-btn" data-day="${jour}" data-slot="1" title="Copier"></button>
                        <button class="btn-paste paste-btn" data-day="${jour}" data-slot="1" title="Coller"></button>
                        <button class="btn-delete delete-btn" data-day="${jour}" data-slot="1" title="Supprimer"></button>
                    </div>
                </div>
            </td>
            <td>
                <div class="time-inputs-wrapper">
                    <div class="time-slot-group">
                        <input type="time" class="heure-debut-2" aria-label="Début heures creuses 2">
                        <span class="time-separator">-</span>
                        <input type="time" class="heure-fin-2" aria-label="Fin heures creuses 2">
                    </div>
                    <div class="action-buttons">
                        <button class="btn-copy copy-btn" data-day="${jour}" data-slot="2" title="Copier"></button>
                        <button class="btn-paste paste-btn" data-day="${jour}" data-slot="2" title="Coller"></button>
                        <button class="btn-delete delete-btn" data-day="${jour}" data-slot="2" title="Supprimer"></button>
                    </div>
                </div>
            </td>
        </tr>
    `).join('');
}
deleteHoraires(day, slot) {
    const row = this.container.querySelector(`tr[data-day="${day}"]`);
    if (!row) return;

    const debutInput = row.querySelector(`.heure-debut-${slot}`);
    const finInput = row.querySelector(`.heure-fin-${slot}`);

    if (debutInput && finInput) {
        // Vider les champs de l'interface
        debutInput.value = '';
        finInput.value = '';

        // Mettre à jour l'état interne de l'objet
        if (this.horaires[day] && this.horaires[day][`slot${slot}`]) {
            this.horaires[day][`slot${slot}`] = { debut: '', fin: '' };
        }
        
        console.log(`Plage horaire ${slot} pour ${day} effacée.`);
        this.showAlert('Plage horaire effacée !', 'success');
    }
}
}

// Export pour utilisation
window.GestionHoraires = GestionHoraires;
