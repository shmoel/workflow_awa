from fastapi import HTTPException
from sqlalchemy.sql import text
from sqlalchemy.orm import Session
from typing import List
from . import models, schemas


def execute_raw_sql(db: Session, sql_query: str, params: dict = None):
    """
    Exécute une requête SQL brute avec des paramètres liés pour éviter les injections SQL.
    
    Args:
        db (Session): Session SQLAlchemy.
        sql_query (str): Requête SQL à exécuter (utilise :param pour les placeholders).
        params (dict, optional): Dictionnaire des paramètres à lier.
    
    Returns:
        list: Résultats de la requête (liste de dictionnaires).
    
    Raises:
        ValueError: Si la requête est vide ou mal formée.
        Exception: Pour les erreurs d'exécution SQL.
    """
    if not sql_query.strip():
        raise ValueError("La requête SQL ne peut pas être vide")
    
    try:
        # Utiliser text() pour exécuter la requête avec des paramètres liés
        statement = text(sql_query)
        if params:
            result = db.execute(statement, params)
        else:
            result = db.execute(statement)
        
        # Récupérer les résultats sous forme de liste de dictionnaires
        if result.returns_rows:
            columns = result.keys()
            return [dict(zip(columns, row)) for row in result.fetchall()]
        else:
            db.commit()
            return {"message": "Requête exécutée avec succès, aucune donnée retournée"}
    
    except Exception as e:
        db.rollback()
        raise Exception(f"Erreur lors de l'exécution de la requête SQL : {str(e)}")

def get_user_by_username(db: Session, username: str):
    return db.query(models.Users).filter(models.Users.username == username).first()

def get_user_by_email(db: Session, email: str):
    return db.query(models.Users).filter(models.Users.email == email).first()

def get_user_by_hashed_password(db: Session, hashed_password: str):
    return db.query(models.Users).filter(models.Users.hashed_password == hashed_password).first()

# CRUD for decision
def create_decision(db: Session, decision: schemas.Decision):
    db_decision = models.Decision(**decision.model_dump())
    db.add(db_decision)
    db.commit()
    db.refresh(db_decision)
    return db_decision

def get_decision(db: Session, decison_id: int):
    return db.query(models.Decision).filter(models.Decision.id == decison_id).first()

def get_decisions(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Decision).offset(skip).limit(limit).all()

def update_decision(db: Session, decision_id: int, decision: schemas.DecisionCreate):
    db_decision = db.query(models.Decision).filter(models.Decision.id == decision_id).first()
    if db_decision is None:
        raise HTTPException(status_code=404, detail="Localisation not found")
    for key, value in decision.model_dump().items():
        setattr(db_decision, key, value)
    db.commit()
    db.refresh(db_decision)
    return db_decision

def delete_decision(db: Session, decision_id: int):
    db_decision = db.query(models.Decision).filter(models.Decision.id == decision_id).first()
    if db_decision is None:
        raise HTTPException(status_code=404, detail="Localisation not found")
    db.delete(db_decision)
    db.commit()
    return db_decision


# CRUD for poste
def create_poste(db: Session, poste: schemas.Poste):
    db_poste = models.Poste(**poste.model_dump())
    db.add(db_poste)
    db.commit()
    db.refresh(db_poste)
    return db_poste

def get_poste(db: Session, poste_id: int):
    return db.query(models.Poste).filter(models.Poste.id == poste_id).first()

def get_postes(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Poste).offset(skip).limit(limit).all()

def update_poste(db: Session, poste_id: int, poste: schemas.PosteCreate):
    db_poste = db.query(models.Poste).filter(models.Poste.id == poste_id).first()
    if db_poste is None:
        raise HTTPException(status_code=404, detail="Localisation not found")
    for key, value in poste.model_dump().items():
        setattr(db_poste, key, value)
    db.commit()
    db.refresh(db_poste)
    return db_poste

def delete_poste(db: Session, poste_id: int):
    db_poste = db.query(models.Poste).filter(models.Poste.id == poste_id).first()
    if db_poste is None:
        raise HTTPException(status_code=404, detail="Localisation not found")
    db.delete(db_poste)
    db.commit()
    return db_poste


# CRUD for Localisation
def create_localisation(db: Session, localisation: schemas.LocalisationCreate):
    db_localisation = models.Localisation(**localisation.model_dump())
    db.add(db_localisation)
    db.commit()
    db.refresh(db_localisation)
    return db_localisation

def get_localisation(db: Session, localisation_id: int):
    return db.query(models.Localisation).filter(models.Localisation.id == localisation_id).first()

def get_localisations(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Localisation).offset(skip).limit(limit).all()

def update_localisation(db: Session, localisation_id: int, localisation: schemas.LocalisationCreate):
    db_localisation = db.query(models.Localisation).filter(models.Localisation.id == localisation_id).first()
    if db_localisation is None:
        raise HTTPException(status_code=404, detail="Localisation not found")
    for key, value in localisation.model_dump().items():
        setattr(db_localisation, key, value)
    db.commit()
    db.refresh(db_localisation)
    return db_localisation

def delete_localisation(db: Session, localisation_id: int):
    db_localisation = db.query(models.Localisation).filter(models.Localisation.id == localisation_id).first()
    if db_localisation is None:
        raise HTTPException(status_code=404, detail="Localisation not found")
    db.delete(db_localisation)
    db.commit()
    return db_localisation

# CRUD for Niveau_hab
def create_niveau_hab(db: Session, niveau_hab: schemas.NiveauHabCreate):
    db_niveau_hab = models.NiveauHab(**niveau_hab.model_dump())
    db.add(db_niveau_hab)
    db.commit()
    db.refresh(db_niveau_hab)
    return db_niveau_hab

def get_niveau_hab(db: Session, niveau_hab_id: int):
    return db.query(models.NiveauHab).filter(models.NiveauHab.id == niveau_hab_id).first()

def get_niveaux_hab(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.NiveauHab).offset(skip).limit(limit).all()

def update_niveau_hab(db: Session, niveau_hab_id: int, niveau_hab: schemas.NiveauHabCreate):
    db_niveau_hab = db.query(models.NiveauHab).filter(models.NiveauHab.id == niveau_hab_id).first()
    if db_niveau_hab is None:
        raise HTTPException(status_code=404, detail="Niveau_hab not found")
    for key, value in niveau_hab.model_dump().items():
        setattr(db_niveau_hab, key, value)
    db.commit()
    db.refresh(db_niveau_hab)
    return db_niveau_hab

def delete_niveau_hab(db: Session, niveau_hab_id: int):
    db_niveau_hab = db.query(models.NiveauHab).filter(models.NiveauHab.id == niveau_hab_id).first()
    if db_niveau_hab is None:
        raise HTTPException(status_code=404, detail="Niveau_hab not found")
    db.delete(db_niveau_hab)
    db.commit()
    return db_niveau_hab

# CRUD for Banque
def create_banque(db: Session, banque: schemas.BanqueCreate):
    db_banque = models.Banque(**banque.model_dump())  # Exclude 'pays' as it's not in the SQLAlchemy model
    db.add(db_banque)
    db.commit()
    db.refresh(db_banque)
    return db_banque

def get_banque(db: Session, banque_id: int):
    return db.query(models.Banque).filter(models.Banque.id == banque_id).first()

def get_banques(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Banque).offset(skip).limit(limit).all()

def update_banque(db: Session, banque_id: int, banque: schemas.BanqueCreate):
    db_banque = db.query(models.Banque).filter(models.Banque.id == banque_id).first()
    if db_banque is None:
        raise HTTPException(status_code=404, detail="Banque not found")
    for key, value in banque.model_dump().items():  # Exclude 'pays' as it's not in the SQLAlchemy model
        setattr(db_banque, key, value)
    db.commit()
    db.refresh(db_banque)
    return db_banque

def delete_banque(db: Session, banque_id: int):
    db_banque = db.query(models.Banque).filter(models.Banque.id == banque_id).first()
    if db_banque is None:
        raise HTTPException(status_code=404, detail="Banque not found")
    db.delete(db_banque)
    db.commit()
    return db_banque

# CRUD for departementGroup
def create_departement_group(db: Session, departement_group: schemas.DepartementGroup):
    db_departement_group = models.DepartementGroup(**departement_group.model_dump())
    db.add(db_departement_group)
    db.commit()
    db.refresh(db_departement_group)
    return db_departement_group

def get_departement_group(db: Session, departement_group_id: int):
    return db.query(models.DepartementGroup).filter(models.DepartementGroup.id == departement_group_id).first()

def get_departement_groups(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.DepartementGroup).offset(skip).limit(limit).all()

def update_departement_group(db: Session, departement_group_id: int, departement_group: schemas.DepartementGroup):
    db_departement_group = db.query(models.DepartementGroup).filter(models.DepartementGroup.id == departement_group_id).first()
    if db_departement_group is None:
        raise HTTPException(status_code=404, detail="DepartementGroup not found")
    for key, value in departement_group.model_dump().items():
        setattr(db_departement_group, key, value)
    db.commit()
    db.refresh(db_departement_group)
    return db_departement_group

def delete_departement_group(db: Session, departement_group_id: int):
    db_departement_group = db.query(models.DepartementGroup).filter(models.DepartementGroup.id == departement_group_id).first()
    if db_departement_group is None:
        raise HTTPException(status_code=404, detail="DepartementGroup not found")
    db.delete(db_departement_group)
    db.commit()
    return db_departement_group

# CRUD for EventStatut
def create_EventStatut(db: Session, EventStatut: schemas.EventStatut):
    db_EventStatut = models.EventStatut(**EventStatut.model_dump())
    db.add(db_EventStatut)
    db.commit()
    db.refresh(db_EventStatut)
    return db_EventStatut

def get_EventStatut(db: Session, EventStatut_id: int):
    return db.query(models.EventStatut).filter(models.EventStatut.id == EventStatut_id).first()

def get_EventStatuts(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.EventStatut).offset(skip).limit(limit).all()

def update_EventStatut(db: Session, EventStatut_id: int, EventStatut: schemas.EventStatut):
    db_EventStatut = db.query(models.EventStatut).filter(models.EventStatut.id == EventStatut_id).first()
    if db_EventStatut is None:
        raise HTTPException(status_code=404, detail="EventStatut not found")
    for key, value in EventStatut.model_dump().items():
        setattr(db_EventStatut, key, value)
    db.commit()
    db.refresh(db_EventStatut)
    return db_EventStatut

def delete_EventStatut(db: Session, EventStatut_id: int):
    db_EventStatut = db.query(models.EventStatut).filter(models.EventStatut.id == EventStatut_id).first()
    if db_EventStatut is None:
        raise HTTPException(status_code=404, detail="EventStatut not found")
    db.delete(db_EventStatut)
    db.commit()
    return db_EventStatut

# CRUD for type_institution
def create_type_institution(db: Session, type_institution: schemas.TypeInstitution):
    db_type_institution = models.TypeInstitution(**type_institution.model_dump())
    db.add(db_type_institution)
    db.commit()
    db.refresh(db_type_institution)
    return db_type_institution

def get_type_institution(db: Session, type_institution_id: int):
    return db.query(models.TypeInstitution).filter(models.TypeInstitution.id == type_institution_id).first()

def get_type_institutions(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.TypeInstitution).offset(skip).limit(limit).all()

def update_type_institution(db: Session, type_institution_id: int, type_institution: schemas.TypeInstitution):
    db_type_institution = db.query(models.TypeInstitution).filter(models.TypeInstitution.id == type_institution_id).first()
    if db_type_institution is None:
        raise HTTPException(status_code=404, detail="TypeInstitution not found")
    for key, value in type_institution.model_dump().items():
        setattr(db_type_institution, key, value)
    db.commit()
    db.refresh(db_type_institution)
    return db_type_institution

def delete_type_institution(db: Session, type_institution_id: int):
    db_type_institution = db.query(models.TypeInstitution).filter(models.TypeInstitution.id == type_institution_id).first()
    if db_type_institution is None:
        raise HTTPException(status_code=404, detail="TypeInstitution not found")
    db.delete(db_type_institution)
    db.commit()
    return db_type_institution

# CRUD for entite
def create_entite(db: Session, entite: schemas.Entite):
    db_entite = models.Entite(**entite.model_dump())
    db.add(db_entite)
    db.commit()
    db.refresh(db_entite)
    return db_entite

def get_entite(db: Session, entite_id: int):
    return db.query(models.Entite).filter(models.Entite.id == entite_id).first()

def get_entites(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Entite).offset(skip).limit(limit).all()

def update_entite(db: Session, entite_id: int, entite: schemas.Entite):
    db_entite = db.query(models.Entite).filter(models.Entite.id == entite_id).first()
    if db_entite is None:
        raise HTTPException(status_code=404, detail="Entite not found")
    for key, value in entite.model_dump().items():
        setattr(db_entite, key, value)
    db.commit()
    db.refresh(db_entite)
    return db_entite

def delete_entite(db: Session, entite_id: int):
    db_entite = db.query(models.Entite).filter(models.Entite.id == entite_id).first()
    if db_entite is None:
        raise HTTPException(status_code=404, detail="Entite not found")
    db.delete(db_entite)
    db.commit()
    return db_entite

# CRUD for niveauValidation
def create_niveau_validation(db: Session, niveau_validation: schemas.NiveauValidation):
    db_niveau_validation = models.NiveauValidation(**niveau_validation.model_dump())
    db.add(db_niveau_validation)
    db.commit()
    db.refresh(db_niveau_validation)
    return db_niveau_validation

def get_niveau_validation(db: Session, niveau_validation_id: int):
    return db.query(models.NiveauValidation).filter(models.NiveauValidation.id == niveau_validation_id).first()

def get_niveau_validations(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.NiveauValidation).offset(skip).limit(limit).all()

def update_niveau_validation(db: Session, niveau_validation_id: int, niveau_validation: schemas.NiveauValidation):
    db_niveau_validation = db.query(models.NiveauValidation).filter(models.NiveauValidation.id == niveau_validation_id).first()
    if db_niveau_validation is None:
        raise HTTPException(status_code=404, detail="NiveauValidation not found")
    for key, value in niveau_validation.model_dump().items():
        setattr(db_niveau_validation, key, value)
    db.commit()
    db.refresh(db_niveau_validation)
    return db_niveau_validation

def delete_niveau_validation(db: Session, niveau_validation_id: int):
    db_niveau_validation = db.query(models.NiveauValidation).filter(models.NiveauValidation.id == niveau_validation_id).first()
    if db_niveau_validation is None:
        raise HTTPException(status_code=404, detail="NiveauValidation not found")
    db.delete(db_niveau_validation)
    db.commit()
    return db_niveau_validation

# CRUD for categorieDemande
def create_categorie_demande(db: Session, categorie_demande: schemas.CategorieDemande):
    db_categorie_demande = models.CategorieDemande(**categorie_demande.model_dump())
    db.add(db_categorie_demande)
    db.commit()
    db.refresh(db_categorie_demande)
    return db_categorie_demande

def get_categorie_demande(db: Session, categorie_demande_id: int):
    return db.query(models.CategorieDemande).filter(models.CategorieDemande.id == categorie_demande_id).first()

def get_categorie_demandes(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.CategorieDemande).offset(skip).limit(limit).all()

def update_categorie_demande(db: Session, categorie_demande_id: int, categorie_demande: schemas.CategorieDemande):
    db_categorie_demande = db.query(models.CategorieDemande).filter(models.CategorieDemande.id == categorie_demande_id).first()
    if db_categorie_demande is None:
        raise HTTPException(status_code=404, detail="CategorieDemande not found")
    for key, value in categorie_demande.model_dump().items():
        setattr(db_categorie_demande, key, value)
    db.commit()
    db.refresh(db_categorie_demande)
    return db_categorie_demande

def delete_categorie_demande(db: Session, categorie_demande_id: int):
    db_categorie_demande = db.query(models.CategorieDemande).filter(models.CategorieDemande.id == categorie_demande_id).first()
    if db_categorie_demande is None:
        raise HTTPException(status_code=404, detail="CategorieDemande not found")
    db.delete(db_categorie_demande)
    db.commit()
    return db_categorie_demande

# CRUD for event_statut
def create_event_statut(db: Session, event_statut: schemas.EventStatut):
    db_event_statut = models.EventStatut(**event_statut.model_dump())
    db.add(db_event_statut)
    db.commit()
    db.refresh(db_event_statut)
    return db_event_statut

def get_event_statut(db: Session, event_statut_id: int):
    return db.query(models.EventStatut).filter(models.EventStatut.id == event_statut_id).first()

def get_event_statuts(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.EventStatut).offset(skip).limit(limit).all()

def update_event_statut(db: Session, event_statut_id: int, event_statut: schemas.EventStatut):
    db_event_statut = db.query(models.EventStatut).filter(models.EventStatut.id == event_statut_id).first()
    if db_event_statut is None:
        raise HTTPException(status_code=404, detail="Typedemande not found")
    for key, value in event_statut.model_dump().items():
        setattr(db_event_statut, key, value)
    db.commit()
    db.refresh(db_event_statut)
    return db_event_statut

def delete_event_statut(db: Session, event_statut_id: int):
    db_event_statut = db.query(models.EventStatut).filter(models.EventStatut.id == event_statut_id).first()
    if db_event_statut is None:
        raise HTTPException(status_code=404, detail="Typedemande not found")
    db.delete(db_event_statut)
    db.commit()
    return db_event_statut


# CRUD for type_demande
def create_type_demande(db: Session, type_demande: schemas.TypeDemande):
    db_type_demande = models.Typedemande(**type_demande.model_dump())
    db.add(db_type_demande)
    db.commit()
    db.refresh(db_type_demande)
    return db_type_demande

def get_type_demande(db: Session, type_demande_id: int):
    return db.query(models.Typedemande).filter(models.Typedemande.id == type_demande_id).first()

def get_type_demandes(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Typedemande).offset(skip).limit(limit).all()

def update_type_demande(db: Session, type_demande_id: int, type_demande: schemas.TypeDemande):
    db_type_demande = db.query(models.Typedemande).filter(models.Typedemande.id == type_demande_id).first()
    if db_type_demande is None:
        raise HTTPException(status_code=404, detail="Typedemande not found")
    for key, value in type_demande.model_dump().items():
        setattr(db_type_demande, key, value)
    db.commit()
    db.refresh(db_type_demande)
    return db_type_demande

def delete_type_demande(db: Session, type_demande_id: int):
    db_type_demande = db.query(models.Typedemande).filter(models.Typedemande.id == type_demande_id).first()
    if db_type_demande is None:
        raise HTTPException(status_code=404, detail="Typedemande not found")
    db.delete(db_type_demande)
    db.commit()
    return db_type_demande

# CRUD pour User
def create_user(db: Session, user: schemas.UsersCreate, hashed_password: str):
    db_user = models.Users(
        username = user.username,
        nom = user.nom,
        prenom = user.prenom,
        hashed_password = hashed_password,
        password = user.password,
        email = user.email,
        id_banque = user.id_banque,
        id_niv_hab = user.id_niv_hab,
        id_entite = user.id_entite,
        id_poste = user.id_poste
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def get_user(db: Session, user_id: int):
    return db.query(models.Users).filter(models.Users.id == user_id).first()

def get_users(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Users).offset(skip).limit(limit).all()

def update_user(db: Session, user_id: int, user: schemas.UsersCreate, hashed_password: str):
    user_ = models.Users(
        username = user.username,
        nom = user.nom,
        prenom = user.prenom,
        hashed_password = hashed_password,
        password = user.password,
        email = user.email,
        id_banque = user.id_banque,
        id_niv_hab = user.id_niv_hab,
        id_entite = user.id_entite,
        id_poste = user.id_poste
    )
    db_user = db.query(models.Users).filter(models.Users.id == user_id).first()
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    for key, value in user_.model_dump().items():
        setattr(db_user, key, value)
    db.commit()
    db.refresh(db_user)
    return db_user

def delete_user(db: Session, user_id: int):
    db_user = db.query(models.Users).filter(models.Users.id == user_id).first()
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(db_user)
    db.commit()
    return db_user

# CRUD for demandes
def create_demande(db: Session, demande: schemas.Demande):
    db_demande = models.Demande(**demande.model_dump())
    db.add(db_demande)
    db.commit()
    db.refresh(db_demande)
    return db_demande

def get_demande(db: Session, demande_id: int):
    return db.query(models.Demande).filter(models.Demande.id == demande_id).first()

def get_demandes(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Demande).offset(skip).limit(limit).all()

def update_demande(db: Session, demande_id: int, demande: schemas.Demande):
    db_demande = db.query(models.Demande).filter(models.Demande.id == demande_id).first()
    if db_demande is None:
        raise HTTPException(status_code=404, detail="Demande not found")
    for key, value in demande.model_dump().items():
        setattr(db_demande, key, value)
    db.commit()
    db.refresh(db_demande)
    return db_demande

def delete_demande(db: Session, demande_id: int):
    db_demande = db.query(models.Demande).filter(models.Demande.id == demande_id).first()
    if db_demande is None:
        raise HTTPException(status_code=404, detail="Demande not found")
    db.delete(db_demande)
    db.commit()
    return db_demande

# CRUD for avis
def create_avis(db: Session, avis: schemas.Avis):
    db_avis = models.Avis(**avis.model_dump())
    db.add(db_avis)
    db.commit()
    db.refresh(db_avis)
    return db_avis

def get_avis(db: Session, avis_id: int):
    return db.query(models.Avis).filter(models.Avis.id == avis_id).first()

def get_avis_list(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Avis).offset(skip).limit(limit).all()

def update_avis(db: Session, avis_id: int, avis: schemas.Avis):
    db_avis = db.query(models.Avis).filter(models.Avis.id == avis_id).first()
    if db_avis is None:
        raise HTTPException(status_code=404, detail="Avis not found")
    for key, value in avis.model_dump().items():
        setattr(db_avis, key, value)
    db.commit()
    db.refresh(db_avis)
    return db_avis

def delete_avis(db: Session, avis_id: int):
    db_avis = db.query(models.Avis).filter(models.Avis.id == avis_id).first()
    if db_avis is None:
        raise HTTPException(status_code=404, detail="Avis not found")
    db.delete(db_avis)
    db.commit()
    return db_avis

# CRUD for commentaires
def create_commentaires(db: Session, commentaires: schemas.Commentaires):
    db_commentaires = models.Commentaires(**commentaires.model_dump())
    db.add(db_commentaires)
    db.commit()
    db.refresh(db_commentaires)
    return db_commentaires

def get_commentaires(db: Session, comm_id: int):
    return db.query(models.Commentaires).filter(models.Commentaires.id == comm_id).first()

def get_commentaires_list(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Commentaires).offset(skip).limit(limit).all()

def update_commentaires(db: Session, comm_id: int, commentaires: schemas.Commentaires):
    db_commentaires = db.query(models.Commentaires).filter(models.Commentaires.id == comm_id).first()
    if db_commentaires is None:
        raise HTTPException(status_code=404, detail="comm not found")
    for key, value in commentaires.model_dump().items():
        setattr(db_commentaires, key, value)
    db.commit()
    db.refresh(db_commentaires)
    return db_commentaires

def delete_commentaires(db: Session, comm_id: int):
    db_commentaires = db.query(models.Commentaires).filter(models.Commentaires.id == comm_id).first()
    if db_commentaires is None:
        raise HTTPException(status_code=404, detail="comm not found")
    db.delete(db_commentaires)
    db.commit()
    return db_commentaires

# CRUD for domaine
def create_domaine(db: Session, domaine: schemas.Domaine):
    db_domaine = models.Domaine(**domaine.model_dump())
    db.add(db_domaine)
    db.commit()
    db.refresh(db_domaine)
    return db_domaine

def get_domaine(db: Session, domaine_id: int):
    return db.query(models.Domaine).filter(models.Domaine.id == domaine_id).first()

def get_all_domaine(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Domaine).offset(skip).limit(limit).all()

def update_domaine(db: Session, domaine_id: int, domaine: schemas.DomaineCreate):
    db_domaine = db.query(models.Domaine).filter(models.Domaine.id == domaine_id).first()
    if db_domaine is None:
        raise HTTPException(status_code=404, detail="Localisation not found")
    for key, value in domaine.model_dump().items():
        setattr(db_domaine, key, value)
    db.commit()
    db.refresh(db_domaine)
    return db_domaine

def delete_domaine(db: Session, domaine_id: int):
    db_domaine = db.query(models.Domaine).filter(models.Domaine.id == domaine_id).first()
    if db_domaine is None:
        raise HTTPException(status_code=404, detail="comm not found")
    db.delete(db_domaine)
    db.commit()
    return db_domaine

# CRUD for user_domaine

def create_userdomaine(db: Session, userdomaine: schemas.UserDomaineCreate):
    db_userdomaine = models.UserDomaine(**userdomaine.model_dump())
    db.add(db_userdomaine)
    db.commit()
    db.refresh(db_userdomaine)
    return db_userdomaine

def get_userdomaine(db: Session, user_id: int, domaine_id: int):
    """
    Retrieve a UserDomaine entry by its composite primary key.
    """
    user_domaine = db.query(models.UserDomaine).filter(
        models.UserDomaine.user_id == user_id,
        models.UserDomaine.domaine_id == domaine_id
    ).first()
    if not user_domaine:
        raise HTTPException(status_code=404, detail="UserDomaine not found")
    return user_domaine

def get_alluserdomaine(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.UserDomaine).offset(skip).limit(limit).all()

def update_user_domaine(db: Session, user_id: int, domaine_id: int, user_domaine_update: schemas.UserDomaine):
    """
    Update a UserDomaine entry by its composite primary key.
    """
    db_user_domaine = db.query(models.UserDomaine).filter(
        models.UserDomaine.user_id == user_id,
        models.UserDomaine.domaine_id == domaine_id
    ).first()
    if not db_user_domaine:
        raise HTTPException(status_code=404, detail="UserDomaine not found")
    
    update_data = user_domaine_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_user_domaine, key, value)
    
    try:
        db.commit()
        db.refresh(db_user_domaine)
        return db_user_domaine
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error updating UserDomaine: {str(e)}")
    
def delete_user_domaine(db: Session, user_id: int, domaine_id: int):
    """
    Delete a UserDomaine entry by its composite primary key.
    """
    db_user_domaine = db.query(models.UserDomaine).filter(
        models.UserDomaine.user_id == user_id,
        models.UserDomaine.domaine_id == domaine_id
    ).first()
    if not db_user_domaine:
        raise HTTPException(status_code=404, detail="UserDomaine not found")
    
    try:
        db.delete(db_user_domaine)
        db.commit()
        return {"detail": "UserDomaine deleted"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error deleting UserDomaine: {str(e)}")
    

# CRUD for commentaire

def create_commentaire(db: Session, usercomm: schemas.CommentairesCreate):
    db_usercommentaire = models.Commentaires(**usercomm.model_dump())
    db.add(db_usercommentaire)
    db.commit()
    db.refresh(db_usercommentaire)
    return db_usercommentaire

