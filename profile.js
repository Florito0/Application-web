class ProfileManager {
    constructor() {
        this.form = document.getElementById('profileForm');
        this.discoNameInput = document.getElementById('discoName');
        this.countryInput = document.getElementById('country');
        this.cityInput = document.getElementById('city');
        this.postalCodeInput = document.getElementById('postalCode');
        this.addressInput = document.getElementById('address');
        this.countryCodeInput = document.getElementById('countryCode');
        this.phoneInput = document.getElementById('phone');
        this.emailInput = document.getElementById('email');
        this.coverImage = document.getElementById('coverImage');
        this.coverUpload = document.getElementById('coverUpload');
        this.coverPlaceholder = document.getElementById('coverPlaceholder');
        this.removeCoverBtn = document.getElementById('removeCoverBtn');
        this.profileData = {};
    }

    async init() {
        await this.loadProfileData();
        this.setupEventListeners();
    }

    async loadProfileData() {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/discotheque', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.status === 404) {
                console.log('Aucun profil existant, affichage d\'un formulaire vide.');
                return;
            }
            if (!response.ok) {
                throw new Error('Erreur lors du chargement du profil');
            }

            this.profileData = await response.json();
            this.populateForm();
        } catch (error) {
            console.error(error);
            alert('Impossible de charger les informations du profil.');
        }
    }

    populateForm() {
        this.discoNameInput.value = this.profileData.nom || '';
        this.cityInput.value = this.profileData.ville || '';
        this.addressInput.value = this.profileData.adresse || '';
        this.phoneInput.value = this.profileData.telephone || '';
        this.emailInput.value = this.profileData.email || '';
        
        if (this.profileData.cover_image_url) {
            this.coverImage.src = this.profileData.cover_image_url;
            this.coverImage.style.display = 'block';
            this.coverPlaceholder.style.display = 'none';
            this.removeCoverBtn.style.display = 'inline-block';
        }
    }

    // 🆕 NOUVELLE MÉTHODE : Confirmation
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

    // 🔧 MODIFIÉE : Avec confirmation
    async handleSave() {
        const userConfirmed = await this.showConfirmation('Souhaitez-vous enregistrer les modifications du profil ?');
        
        if (!userConfirmed) {
            return;
        }

        const formData = {
            nom: this.discoNameInput.value,
            ville: this.cityInput.value,
            adresse: this.addressInput.value,
            telephone: this.phoneInput.value,
            email: this.emailInput.value,
            cover_image_url: this.coverImage.src
        };

        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/discotheque', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                throw new Error(`La sauvegarde a échoué avec le statut: ${response.status}`);
            }
            
            this.profileData = await response.json();
            alert('Profil sauvegardé avec succès !');

        } catch (error) {
            console.error(error);
            alert('Erreur lors de la sauvegarde du profil.');
        }
    }
    
    handleImageUpload(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                this.coverImage.src = e.target.result;
                this.coverImage.style.display = 'block';
                this.coverPlaceholder.style.display = 'none';
                this.removeCoverBtn.style.display = 'inline-block';
            };
            reader.readAsDataURL(file);
        }
    }

    handleImageRemove() {
        this.coverImage.src = '';
        this.coverImage.style.display = 'none';
        this.coverPlaceholder.style.display = 'flex';
        this.removeCoverBtn.style.display = 'none';
        this.coverUpload.value = '';
    }

    setupEventListeners() {
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSave();
        });

        this.coverUpload.addEventListener('change', (e) => this.handleImageUpload(e));
        this.removeCoverBtn.addEventListener('click', () => this.handleImageRemove());
    }
}
