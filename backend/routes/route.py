from fastapi import APIRouter, Depends, HTTPException, status, Response, Form, UploadFile, File
from starlette.responses import RedirectResponse
from typing import List
from fastapi.responses import HTMLResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
from .. import models, schemas, crud
from ..database import get_db
from ..auth import get_password_hash, authenticate_user, create_access_token, get_current_user
import os
from datetime import datetime
import logging
from pathlib import Path
from fastapi.responses import FileResponse
import os


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)



router = APIRouter(prefix="/api", tags=["API"])

# Dossier où sauvegarder les fichiers
#BASE_DIR = Path(__file__).resolve().parent.parent.parent
BASE_DIR = "/var/data"

#BASE_DIR = Path("/app")  # Chemin de base sur Render
UPLOAD_DIR = BASE_DIR + "/notes_analyse"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.get("/.well-known/appspecific/{path:path}")
async def ignore_devtools(path: str):
    return Response(status_code=404)

@router.get("/test")
def test_route():
    return {"message": "Test réussi"}




@router.get("/download/{filename}")
async def download_file(filename: str):
    file_path = os.path.join(UPLOAD_DIR, filename)

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Fichier introuvable")

     # Détection simple du type
    ext = filename.split(".")[-1].lower()

    media_types = {
        "pdf": "application/pdf",
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg",
        "png": "image/png"
    }

    media_type = media_types.get(ext, "application/octet-stream")

    return FileResponse(
        path=file_path,
        filename=filename,
        media_type=media_types
    )


@router.get("/types_demandes/{categorie}/")
async def get_types_demandes_categories(
    categorie: str,
    user: schemas.Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    

    if isinstance(user, RedirectResponse):
        return user
    
    # Requête SQL avec jointures
    sql_query = """
        SELECT 
            t.id AS demande_id,
            t.libelle AS nom_demande,
            c.libelle AS nom_categorie_dmd, 
            c.id AS categorie_id
        FROM typedemande t
        JOIN categoriedemande c ON t.id_categoriedemande = c.id
        WHERE c.libelle = :categorie
    """
    
    try:
        result = crud.execute_raw_sql(db, sql_query, {"categorie": categorie})
        return {"results": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/users-joined/")
async def get_users_joined(
    user: schemas.Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    
    if isinstance(user, RedirectResponse):
        return user
    
    # Requête SQL avec jointures
    sql_query = """
        SELECT 
            u.id AS user_id,
            u.username,
            u.nom,
            u.prenom,
            u.email,
            b.sigle AS banque,
            b.id_type_instit AS id_type_instit,
            niv.code AS niveau_hab,
            ent.libelle AS entite,
            p.libelle AS poste,
            d.libelle AS domaine
        FROM users u
        JOIN banque b ON u.id_banque = b.id
        JOIN niveauhab niv ON u.id_niv_hab = niv.id
        JOIN entite ent ON u.id_entite = ent.id
        JOIN poste p ON u.id_poste = p.id
        JOIN user_domaine ud ON u.id = ud.user_id
        JOIN domaine d ON ud.domaine_id = d.id
        WHERE u.username = :u_name
    """
    
    try:
        result = crud.execute_raw_sql(db, sql_query, {"u_name": user.username})
        return {"results": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Endpoint pour login
@router.post("/login/", response_model=schemas.Token)
async def login(form_data: schemas.LoginRequest, db: Session = Depends(get_db)):

    print("tentative de connexion")
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=30)
    access_token = create_access_token(
        data={"sub": user.username},
        expires_delta=access_token_expires,
    )

    print(access_token)
    
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/logout/")
async def logout(response: Response):
    # Supprimer le cookie
    response.delete_cookie(
        key="access_token",
        httponly=True,
        secure=False,  # Passe à True en production
        samesite="strict"
    )
    return {"message": "Déconnexion réussie"}
    # Rediriger vers la page de connexion
    #return RedirectResponse(url="workflow/index.html", status_code=303)

# Endpoint /users/me/
@router.get("/users/me/")
async def read_users_me(current_user: schemas.Users = Depends(get_current_user)):
    print(current_user.username)
    print(current_user.id_niv_hab)
    return {"result": current_user}



# Endpoint pour l'inscription
@router.post("/register", response_model=schemas.Users)
def register_user(user: schemas.UsersCreate, db: Session = Depends(get_db)):
    try:
        # Vérifier l'unicité du username
        if crud.get_user_by_username(db, user.username):
            raise HTTPException(status_code=400, detail="Username already registered")
        # Vérifier l'unicité de l'email (si fourni)
        if user.email and crud.get_user_by_email(db, user.email):
            raise HTTPException(status_code=400, detail="Email already registered")
        # Hacher le mot de passe
        hashed_password = get_password_hash(user.password)

        # Créer l'utilisateur
        db_user = crud.create_user(db, user, hashed_password)
        return db_user
    except Exception as e:
        # Journaliser l'erreur pour le débogage
        print(f"Error in register_user: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/register", response_model=List[schemas.Users])
def read_register_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    try:
        register_users = crud.get_users(db, skip, limit)
        return register_users
    except Exception as e:
        # Journaliser l'erreur pour le débogage
        print(f"Error in register_user: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


# Localisation Endpoints
@router.post("/localisations/", response_model=schemas.Localisation)
def create_localisation(localisation: schemas.LocalisationCreate, db: Session = Depends(get_db)):
    return crud.create_localisation(db=db, localisation=localisation)

@router.get("/localisations/{localisation_id}", response_model=schemas.Localisation)
def read_localisation(localisation_id: int, db: Session = Depends(get_db)):
    db_localisation = crud.get_localisation(db, localisation_id=localisation_id)
    if db_localisation is None:
        raise HTTPException(status_code=404, detail="Localisation not found")
    return db_localisation

@router.get("/localisations/", response_model=List[schemas.Localisation])
def read_localisations(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    localisations = crud.get_localisations(db, skip=skip, limit=limit)
    return localisations

@router.put("/localisations/{localisation_id}", response_model=schemas.Localisation)
def update_localisation(localisation_id: int, localisation: schemas.LocalisationCreate, db: Session = Depends(get_db)):
    return crud.update_localisation(db=db, localisation_id=localisation_id, localisation=localisation)

@router.delete("/localisations/{localisation_id}", response_model=schemas.Localisation)
def delete_localisation(localisation_id: int, db: Session = Depends(get_db)):
    return crud.delete_localisation(db=db, localisation_id=localisation_id)

# NiveauHab Endpoints
@router.post("/niveaux_hab/", response_model=schemas.NiveauHab)
def create_NiveauHab(niveau_Hab: schemas.NiveauHabCreate, db: Session = Depends(get_db)):
    return crud.create_niveau_hab(db=db, niveau_hab=niveau_Hab)

@router.get("/niveaux_hab/{NiveauHab_id}", response_model=schemas.NiveauHab)
def read_NiveauHab(niveau_hab_id: int, db: Session = Depends(get_db)):
    db_NiveauHab = crud.get_niveau_hab(db, niveau_hab_id=niveau_hab_id)
    if db_NiveauHab is None:
        raise HTTPException(status_code=404, detail="NiveauHab not found")
    return db_NiveauHab

@router.get("/niveaux_hab/", response_model=List[schemas.NiveauHab])
def read_niveaux_hab(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    niveaux_hab = crud.get_niveaux_hab(db, skip=skip, limit=limit)
    return niveaux_hab

@router.put("/niveaux_hab/{NiveauHab_id}", response_model=schemas.NiveauHab)
def update_NiveauHab(niveau_hab_id: int, niveau_hab: schemas.NiveauHabCreate, db: Session = Depends(get_db)):
    return crud.update_niveau_hab(db=db, niveau_hab_id=niveau_hab_id, niveau_hab=niveau_hab)

@router.delete("/niveaux_hab/{NiveauHab_id}", response_model=schemas.NiveauHab)
def delete_NiveauHab(niveau_hab_id: int, db: Session = Depends(get_db)):
    return crud.delete_niveau_hab(db=db, niveau_hab_id=niveau_hab_id)

# Banque Endpoints
@router.post("/banques/", response_model=schemas.Banque)
def create_banque(banque: schemas.BanqueCreate, db: Session = Depends(get_db)):
    return crud.create_banque(db=db, banque=banque)

@router.get("/banques/{banque_id}", response_model=schemas.Banque)
def read_banque(banque_id: int, db: Session = Depends(get_db)):
    db_banque = crud.get_banque(db, banque_id=banque_id)
    if db_banque is None:
        raise HTTPException(status_code=404, detail="Banque not found")
    return db_banque

@router.get("/banques/", response_model=List[schemas.Banque])
def read_banques(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    banques = crud.get_banques(db, skip=skip, limit=limit)
    return banques

@router.put("/banques/{banque_id}", response_model=schemas.Banque)
def update_banque(banque_id: int, banque: schemas.BanqueCreate, db: Session = Depends(get_db)):
    return crud.update_banque(db=db, banque_id=banque_id, banque=banque)

@router.delete("/banques/{banque_id}", response_model=schemas.Banque)
def delete_banque(banque_id: int, db: Session = Depends(get_db)):
    return crud.delete_banque(db=db, banque_id=banque_id)

# departementGroup Endpoints
@router.post("/departement_groups/", response_model=schemas.DepartementGroup)
def create_departement_group(departement_group: schemas.DepartementGroupCreate, db: Session = Depends(get_db)):
    return crud.create_departement_group(db=db, departement_group=departement_group)

@router.get("/departement_groups/{departement_group_id}", response_model=schemas.DepartementGroup)
def read_departement_group(departement_group_id: int, db: Session = Depends(get_db)):
    db_departement_group = crud.get_departement_group(db, departement_group_id=departement_group_id)
    if db_departement_group is None:
        raise HTTPException(status_code=404, detail="DepartementGroup not found")
    return db_departement_group

@router.get("/departement_groups/", response_model=List[schemas.DepartementGroup])
def read_departement_groups(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    departement_groups = crud.get_departement_groups(db, skip=skip, limit=limit)
    return departement_groups

@router.put("/departement_groups/{departement_group_id}", response_model=schemas.DepartementGroup)
def update_departement_group(departement_group_id: int, departement_group: schemas.DepartementGroupCreate, db: Session = Depends(get_db)):
    return crud.update_departement_group(db=db, departement_group_id=departement_group_id, departement_group=departement_group)

@router.delete("/departement_groups/{departement_group_id}", response_model=schemas.DepartementGroup)
def delete_departement_group(departement_group_id: int, db: Session = Depends(get_db)):
    return crud.delete_departement_group(db=db, departement_group_id=departement_group_id)

# event_statut Endpoints
@router.post("/event_statuts/", response_model=schemas.EventStatut)
def create_event_statut(event_statut: schemas.EventStatutCreate, db: Session = Depends(get_db)):
    return crud.create_event_statut(db=db, event_statut=event_statut)

@router.get("/event_statuts/{event_statut_id}", response_model=schemas.EventStatut)
def read_event_statut(event_statut_id: int, db: Session = Depends(get_db)):
    db_event_statut = crud.get_event_statut(db, event_statut_id=event_statut_id)
    if db_event_statut is None:
        raise HTTPException(status_code=404, detail="EventStatut not found")
    return db_event_statut

@router.get("/event_statuts/", response_model=List[schemas.EventStatut])
def read_event_statuts(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    event_statuts = crud.get_event_statuts(db, skip=skip, limit=limit)
    return event_statuts

@router.put("/event_statuts/{event_statut_id}", response_model=schemas.EventStatut)
def update_event_statut(event_statut_id: int, event_statut: schemas.EventStatutCreate, db: Session = Depends(get_db)):
    return crud.update_event_statut(db=db, event_statut_id=event_statut_id, event_statut=event_statut)

@router.delete("/event_statuts/{event_statut_id}", response_model=schemas.EventStatut)
def delete_event_statut(event_statut_id: int, db: Session = Depends(get_db)):
    return crud.delete_event_statut(db=db, event_statut_id=event_statut_id)

# type_institution Endpoints
@router.post("/type_institutions/", response_model=schemas.TypeInstitution)
def create_type_institution(type_institution: schemas.TypeInstitutionCreate, db: Session = Depends(get_db)):
    return crud.create_type_institution(db=db, type_institution=type_institution)

@router.get("/type_institutions/{type_institution_id}", response_model=schemas.TypeInstitution)
def read_type_institution(type_institution_id: int, db: Session = Depends(get_db)):
    db_type_institution = crud.get_type_institution(db, type_institution_id=type_institution_id)
    if db_type_institution is None:
        raise HTTPException(status_code=404, detail="TypeInstitution not found")
    return db_type_institution

@router.get("/type_institutions/", response_model=List[schemas.TypeInstitution])
def read_type_institutions(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    type_institutions = crud.get_type_institutions(db, skip=skip, limit=limit)
    return type_institutions

@router.put("/type_institutions/{type_institution_id}", response_model=schemas.TypeInstitution)
def update_type_institution(type_institution_id: int, type_institution: schemas.TypeInstitutionCreate, db: Session = Depends(get_db)):
    return crud.update_type_institution(db=db, type_institution_id=type_institution_id, type_institution=type_institution)

@router.delete("/type_institutions/{type_institution_id}", response_model=schemas.TypeInstitution)
def delete_type_institution(type_institution_id: int, db: Session = Depends(get_db)):
    return crud.delete_type_institution(db=db, type_institution_id=type_institution_id)

# entite Endpoints
@router.post("/entites/", response_model=schemas.Entite)
def create_entite(entite: schemas.EntiteCreate, db: Session = Depends(get_db)):
    return crud.create_entite(db=db, entite=entite)

@router.get("/entites/{entite_id}", response_model=schemas.Entite)
def read_entite(entite_id: int, db: Session = Depends(get_db)):
    db_entite = crud.get_entite(db, entite_id=entite_id)
    if db_entite is None:
        raise HTTPException(status_code=404, detail="Entite not found")
    return db_entite

@router.get("/entites/", response_model=List[schemas.Entite])
def read_entites(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    entites = crud.get_entites(db, skip=skip, limit=limit)
    return entites

@router.put("/entites/{entite_id}", response_model=schemas.Entite)
def update_entite(entite_id: int, entite: schemas.EntiteCreate, db: Session = Depends(get_db)):
    return crud.update_entite(db=db, entite_id=entite_id, entite=entite)

@router.delete("/entites/{entite_id}", response_model=schemas.Entite)
def delete_entite(entite_id: int, db: Session = Depends(get_db)):
    return crud.delete_entite(db=db, entite_id=entite_id)

# niveauValidation Endpoints
@router.post("/niveau_validations/", response_model=schemas.NiveauValidation)
def create_niveau_validation(niveau_validation: schemas.NiveauValidationCreate, db: Session = Depends(get_db)):
    return crud.create_niveau_validation(db=db, niveau_validation=niveau_validation)

@router.get("/niveau_validations/{niveau_validation_id}", response_model=schemas.NiveauValidation)
def read_niveau_validation(niveau_validation_id: int, db: Session = Depends(get_db)):
    db_niveau_validation = crud.get_niveau_validation(db, niveau_validation_id=niveau_validation_id)
    if db_niveau_validation is None:
        raise HTTPException(status_code=404, detail="NiveauValidation not found")
    return db_niveau_validation

@router.get("/niveau_validations/", response_model=List[schemas.NiveauValidation])
def read_niveau_validations(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    niveau_validations = crud.get_niveau_validations(db, skip=skip, limit=limit)
    return niveau_validations

@router.put("/niveau_validations/{niveau_validation_id}", response_model=schemas.NiveauValidation)
def update_niveau_validation(niveau_validation_id: int, niveau_validation: schemas.NiveauValidationCreate, db: Session = Depends(get_db)):
    return crud.update_niveau_validation(db=db, niveau_validation_id=niveau_validation_id, niveau_validation=niveau_validation)

@router.delete("/niveau_validations/{niveau_validation_id}", response_model=schemas.NiveauValidation)
def delete_niveau_validation(niveau_validation_id: int, db: Session = Depends(get_db)):
    return crud.delete_niveau_validation(db=db, niveau_validation_id=niveau_validation_id)

# categorieDemande Endpoints
@router.post("/categorie_demandes/", response_model=schemas.CategorieDemande)
def create_categorie_demande(categorie_demande: schemas.CategorieDemandeCreate, db: Session = Depends(get_db)):
    return crud.create_categorie_demande(db=db, categorie_demande=categorie_demande)

@router.get("/categorie_demandes/{categorie_demande_id}", response_model=schemas.CategorieDemande)
def read_categorie_demande(categorie_demande_id: int, db: Session = Depends(get_db)):
    db_categorie_demande = crud.get_categorie_demande(db, categorie_demande_id=categorie_demande_id)
    if db_categorie_demande is None:
        raise HTTPException(status_code=404, detail="CategorieDemande not found")
    return db_categorie_demande

@router.get("/categorie_demandes/", response_model=List[schemas.CategorieDemande])
def read_categorie_demandes(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    categorie_demandes = crud.get_categorie_demandes(db, skip=skip, limit=limit)
    return categorie_demandes

@router.put("/categorie_demandes/{categorie_demande_id}", response_model=schemas.CategorieDemande)
def update_categorie_demande(categorie_demande_id: int, categorie_demande: schemas.CategorieDemandeCreate, db: Session = Depends(get_db)):
    return crud.update_categorie_demande(db=db, categorie_demande_id=categorie_demande_id, categorie_demande=categorie_demande)

@router.delete("/categorie_demandes/{categorie_demande_id}", response_model=schemas.CategorieDemande)
def delete_categorie_demande(categorie_demande_id: int, db: Session = Depends(get_db)):
    return crud.delete_categorie_demande(db=db, categorie_demande_id=categorie_demande_id)

# type_demande Endpoints
@router.post("/type_demandes/", response_model=schemas.TypeDemande)
def create_type_demande(type_demande: schemas.TypeDemandeCreate, db: Session = Depends(get_db)):
    return crud.create_type_demande(db=db, type_demande=type_demande)

@router.get("/type_demandes/{type_demande_id}", response_model=schemas.TypeDemande)
def read_type_demande(type_demande_id: int, db: Session = Depends(get_db)):
    db_type_demande = crud.get_type_demande(db, type_demande_id=type_demande_id)
    if db_type_demande is None:
        raise HTTPException(status_code=404, detail="TypeDemande not found")
    return db_type_demande

@router.get("/type_demandes/", response_model=List[schemas.TypeDemande])
def read_type_demandes(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    type_demandes = crud.get_type_demandes(db, skip=skip, limit=limit)
    return type_demandes

@router.put("/type_demandes/{type_demande_id}", response_model=schemas.TypeDemande)
def update_type_demande(type_demande_id: int, type_demande: schemas.TypeDemandeCreate, db: Session = Depends(get_db)):
    return crud.update_type_demande(db=db, type_demande_id=type_demande_id, type_demande=type_demande)

@router.delete("/type_demandes/{type_demande_id}", response_model=schemas.TypeDemande)
def delete_type_demande(type_demande_id: int, db: Session = Depends(get_db)):
    return crud.delete_type_demande(db=db, type_demande_id=type_demande_id)

# Users Endpoints
@router.post("/User/", response_model=schemas.Users)
def create_Users(Users: schemas.UsersCreate, db: Session = Depends(get_db)):
    return crud.create_user(db=db, Users=Users)

@router.get("/User/{Users_id}", response_model=schemas.Users)
def read_User(Users_id: int, db: Session = Depends(get_db)):
    db_User = crud.get_user(db, Users_id=Users_id)
    if db_User is None:
        raise HTTPException(status_code=404, detail="Users not found")
    return db_User

@router.get("/Users/", response_model=List[schemas.Users])
def read_Users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    Userss = crud.get_users(db, skip=skip, limit=limit)
    return Userss

@router.put("/User/{Users_id}", response_model=schemas.Users)
def update_User(Users_id: int, Users: schemas.UsersCreate, db: Session = Depends(get_db)):
    return crud.update_user(db=db, Users_id=Users_id, Users=Users)

@router.delete("/Users/{Users_id}", response_model=schemas.Users)
def delete_User(Users_id: int, db: Session = Depends(get_db)):
    return crud.delete_user(db=db, Users_id=Users_id)

# demandes Endpoints

# chemin pour enregistrer une demande
@router.post("/demandes/", response_model=schemas.Demande)
async def create_demande(id_user: int = Form(...),
                         banque: int = Form(...),
                         nom_client: str = Form(...),
                         montant: float = Form(...),
                         commentaire_intro: str = Form(None),
                         id_typedemande: int = Form(...),
                         note_analyse: UploadFile = File(...), 
                         db: Session = Depends(get_db)):
    
    logger.info(f"Reçu demande: id_user={id_user}, banque={banque}, nom_client={nom_client}")
    
    current_date = datetime.now().strftime("%Y-%m-%d")  # Format YYYY-MM-DD
    current_heure = datetime.now().strftime("%H:%M:%S")    # Format HH:MM:SS

    # Créer un objet DemandeCreate
    demande_data = {
        "id_user": id_user,
        "banque": banque,
        "nom_client": nom_client,
        "montant": montant,
        "commentaire_intro": commentaire_intro,
        "id_typedemande": id_typedemande,
        "date": current_date,
        "heure": current_heure
    }

    demande = schemas.DemandeCreate(**demande_data)

    # Gérer le fichier
    file_path = None
    if note_analyse:

        
        allowed_extensions = {".pdf", ".jpg", ".jpeg", ".png"}
        file_extension = os.path.splitext(note_analyse.filename)[1].lower()
        if file_extension not in allowed_extensions:
            raise HTTPException(status_code=400, detail=f"Type de fichier non autorisé. Utilisez {allowed_extensions}")
        content = await note_analyse.read()

        if len(content) > 5 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="Le fichier ne doit pas dépasser 5MB")
        unique_filename = f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{note_analyse.filename}"
        file_path = os.path.join(UPLOAD_DIR, unique_filename)

        try:
            os.makedirs(UPLOAD_DIR, exist_ok=True)
            with open(file_path, "wb") as f:
                f.write(content)
            logger.info(f"Fichier sauvegardé: {file_path}")
            demande.note_analyse = unique_filename
        except Exception as e:
            logger.error(f"Erreur sauvegarde fichier: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Erreur lors de la sauvegarde du fichier : {str(e)}")
    
    try:
        db_demande = crud.create_demande(db=db, demande=demande)
        logger.info("Demande créée dans la base de données")
        return db_demande
    except Exception as e:
        logger.error(f"Erreur création demande: {str(e)}")
        if file_path and os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Erreur lors de la création de la demande : {str(e)}")

# demandes Endpoints
@router.post("/update_demandes/{demande_id}", response_model=schemas.Demande)
async def create_demande(demande_id: int,
                         id_user: int = Form(...),
                         banque: int = Form(...),
                         nom_client: str = Form(...),
                         montant: float = Form(...),
                         commentaire_intro: str = Form(None),
                         id_typedemande: int = Form(...),
                         note_analyse: UploadFile = File(None), 
                         db: Session = Depends(get_db)):
    
    logger.info(f"Reçu demande: id_user={id_user}, banque={banque}, nom_client={nom_client}")
    
    current_date = datetime.now().strftime("%Y-%m-%d")  # Format YYYY-MM-DD
    current_heure = datetime.now().strftime("%H:%M:%S")    # Format HH:MM:SS

    # Créer un objet DemandeCreate
    demande_data = {
        "id_user": id_user,
        "banque": banque,
        "nom_client": nom_client,
        "montant": montant,
        "commentaire_intro": commentaire_intro,
        "id_typedemande": id_typedemande,
    }

    demande = schemas.DemandeBase(**demande_data)

    # Gérer le fichier
    file_path = None
    if note_analyse:
        
        allowed_extensions = {".pdf", ".jpg", ".jpeg", ".png"}
        file_extension = os.path.splitext(note_analyse.filename)[1].lower()
        if file_extension not in allowed_extensions:
            raise HTTPException(status_code=400, detail=f"Type de fichier non autorisé. Utilisez {allowed_extensions}")
        if note_analyse.size > 5 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="Le fichier ne doit pas dépasser 5MB")

        unique_filename = f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{note_analyse.filename}"
        file_path = os.path.join(UPLOAD_DIR, unique_filename)

        try:
            os.makedirs(UPLOAD_DIR, exist_ok=True)
            with open(file_path, "wb") as f:
                f.write(await note_analyse.read())
            demande_data["note_analyse"] = file_path
            logger.info(f"Fichier sauvegardé: {file_path}")
        except Exception as e:
            logger.error(f"Erreur sauvegarde fichier: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Erreur lors de la sauvegarde du fichier : {str(e)}")
    
    try:
        if note_analyse:
            db_demande = crud.update_demande(db=db, demande_id=demande_id, demande=schemas.DemandeBase(**demande_data))
        else:
            db_demande = crud.update_demande(db=db, demande_id=demande_id, demande=schemas.DemandeForUpdate(**demande_data))
        logger.info("Demande modifiée dans la base de données")
        return db_demande
    except Exception as e:
        logger.error(f"Erreur création demande: {str(e)}")
        if file_path and os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Erreur lors de la modification de la demande : {str(e)}")


@router.get("/demandes/{demande_id}")
def read_demande(demande_id: int, db: Session = Depends(get_db)):
    # Requête SQL robuste pour ramener toutes les infos liées à la demande, y compris le dernier statut
    sql_query = """
        SELECT 
            t.libelle AS type_demande,
            t.id AS id_type_demande,
            c.id AS id_categorie_demande,
            c.libelle AS categorie_demande,
            d.nom_client AS nom_client,
            d.montant AS montant,
            d.date AS date_creation,
            d.heure AS heure_creation,
            d.id AS id_demande,
            d.note_analyse AS note_analyse,
            b.sigle AS banque_user,
            d.commentaire_intro AS commentaire_intro,
            req.description AS description
        FROM demandes d
        JOIN typedemande t ON d.id_typedemande = t.id
        JOIN categoriedemande c ON c.id = t.id_categoriedemande
        JOIN banque b ON b.id = d.banque
        JOIN  (
            select * from eventstatut 
            join (select max(id_demande) id_demande, max(id_event) id_statut from (select * from avis where id_demande = :id_dmd)) a 
            on eventstatut.id = a.id_statut
        ) req ON req.id_demande = d.id
        WHERE d.id = :id_demande
    """
    try:
        results = crud.execute_raw_sql(db, sql_query, {"id_dmd": demande_id,"id_demande": demande_id})
        if not results:
            raise HTTPException(status_code=404, detail="Demande not found")
        return {"result": results[0]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    

#charger le détails des commentaires d'une demande à partir de son identifiant
@router.get("/commentaires_demande/{demande_id}")
async def get_commentaire_demande(
    demande_id :int,
    user: schemas.Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    
    if isinstance(user, RedirectResponse):
        return user
    # Requête SQL avec jointures
    sql_query = """
       SELECT 
            u.nom AS nom,
            u.prenom AS prenom,
            b.sigle AS banque,
            e.libelle AS entite,
            d.libelle AS decision,
            a.commentaire AS commentaire,
            event.libelle AS event_d,
            event.description AS statut_d, 
            (a.date || '  ' || a.heure)::timestamp AS date_time
        FROM users u 
        JOIN avis a ON a.id_valideur = u.id
        JOIN banque b ON b.id = u.id_banque
        JOIN entite e ON e.id = u.id_entite
        JOIN decision d ON d.id = a.id_decision
        JOIN eventstatut AS event ON event.id = a.id_event 
        WHERE a.id_demande = :id_demande ORDER BY (a.date || '  ' || a.heure)::timestamp DESC
    """
    try:
        result = crud.execute_raw_sql(db, sql_query, {"id_demande": demande_id})
        return {"results": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

#charger la demande à partir de l'identifiant de la demande
@router.get("/demande_particulier/{demande_id}")
async def get_demande_particulier(
    demande_id :int,
    user: schemas.Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    if isinstance(user, RedirectResponse):
        return user
    # Requête SQL avec jointures
    sql_query = """
       SELECT 
            t.libelle AS type_demande,
            t.id AS id_type_demande,
            c.id AS id_categorie_demande,
            c.libelle AS categorie_demande,
            d.nom_client AS nom_client,
            d.montant AS montant,
            d.date AS date,
            d.heure AS heure,
            d.id AS id_demande,
            d.note_analyse AS note_analyse,
            (d.date || ' ' || d.heure)::timestamp AS date_time,
            b.sigle AS banque
        FROM typedemande t 
        JOIN categoriedemande c ON c.id = t.id_categoriedemande
        JOIN demandes d ON d.id_typedemande = t.id
        JOIN banque b ON b.id = d.banque
        WHERE d.id = :id_demande
    """
    try:
        result = crud.execute_raw_sql(db, sql_query, {"id_demande": demande_id})
        return {"results": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    

# chemin pour les demandes que l'utilisateur qui vient enregistrer et qui ne sont pas encore validées
@router.get("/demandes_user/")
async def get_demandes_user(
    user: schemas.Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):


    if isinstance(user, RedirectResponse):
        return user
    # Requête SQL avec jointures
    sql_query = """
        SELECT dmd.*, a.max_event
        FROM (SELECT 
            t.libelle AS type_demande,
            t.id AS id_type_demande,
            c.id AS id_categorie_demande,
            c.libelle AS categorie_demande,
            d.nom_client AS nom_client,
            d.montant AS montant,
            d.date AS date,
            d.heure AS heure,
            d.id AS id_demande,
            (d.date || ' ' || d.heure)::timestamp AS date_time
            FROM typedemande t 
            JOIN categoriedemande c ON c.id = t.id_categoriedemande
            JOIN demandes d ON d.id_typedemande = t.id
            WHERE d.id_user = :u_id) dmd
        JOIN (SELECT id_demande, MAX(id_event) AS max_event FROM avis GROUP BY id_demande HAVING MAX(id_event) = 1) a ON a.id_demande = dmd.id_demande 
        ORDER BY dmd.date_time DESC
    """
    try:
        result = crud.execute_raw_sql(db, sql_query, {"u_id": user.id})
        return {"results": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# chemin pour les demandes que l'utilisateur ayant déjà été vilidées par un tiers
@router.get("/demandes_user_valider/")
async def get_demandes_user_valider(
    user: schemas.Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    

    if isinstance(user, RedirectResponse):
        return user
    # Requête SQL avec jointures
    sql_query = """
        SELECT * FROM
        (SELECT dmd.*, a.max_event, a.date_val
        FROM (SELECT 
            t.libelle AS type_demande,
            t.id AS id_type_demande,
            c.id AS id_categorie_demande,
            c.libelle AS categorie_demande,
            d.nom_client AS nom_client,
            d.montant AS montant,
            d.date AS date,
            d.heure AS heure,
            d.id AS id_demande,
            (d.date || ' ' || d.heure)::timestamp AS date_time
            FROM typedemande t 
            JOIN categoriedemande c ON c.id = t.id_categoriedemande
            JOIN demandes d ON d.id_typedemande = t.id
            WHERE d.id_user = :u_id) dmd
        JOIN (SELECT id_demande, MAX(id_event) AS max_event, (MAX(date) || '  ' || MAX(heure))::timestamp AS date_val FROM avis GROUP BY id_demande HAVING MAX(id_event) NOT IN(1,6,7,8,9)) a ON a.id_demande = dmd.id_demande 
        ) req1
        JOIN eventstatut ON eventstatut.id = req1.max_event ORDER BY req1.date_val DESC
    """
    try:
        result = crud.execute_raw_sql(db, sql_query, {"u_id": user.id})
        return {"results": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# chemin pour les demandes que l'utilisateur ayant été au bout du process soit pas arrêtées par le DG local
@router.get("/demandes_fin_process/")
async def get_demandes_fin_process(
    user: schemas.Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    
    if isinstance(user, RedirectResponse):
        return user
    # Requête SQL avec jointures
    sql_query = """
        SELECT * FROM
        (SELECT dmd.*, a.max_event, a.date_val
        FROM (SELECT 
            t.libelle AS type_demande,
            t.id AS id_type_demande,
            c.id AS id_categorie_demande,
            c.libelle AS categorie_demande,
            d.nom_client AS nom_client,
            d.montant AS montant,
            d.date AS date,
            d.heure AS heure,
            d.id AS id_demande,
            (d.date || ' ' || d.heure)::timestamp AS date_time
            FROM typedemande t 
            JOIN categoriedemande c ON c.id = t.id_categoriedemande
            JOIN demandes d ON d.id_typedemande = t.id
            ) dmd
        JOIN ( SELECT * FROM (SELECT MAX(id_valideur) AS id_valideur, id_demande, MAX(id_event) AS max_event, (MAX(date) || ' ' || MAX(heure))::timestamp AS date_val 
                FROM avis GROUP BY id_demande HAVING MAX(id_event) IN (6,9)) 
                WHERE id_demande in (SELECT id_demande FROM avis WHERE id_valideur = :u_id)) a ON a.id_demande = dmd.id_demande 
        ) req1
        JOIN eventstatut ON eventstatut.id = req1.max_event ORDER BY req1.date_val DESC
    """
    try:
        result = crud.execute_raw_sql(db, sql_query, {"u_id": user.id})
        return {"results": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



# demandes a charger dans la page accueil poour des users en fonction de leurs positions(FILIALES, REGIONAL, GROUP CENTRAL)
@router.get("/demandes_chat/{token}")
async def get_demandes_chater(
    token: str,
    db: Session = Depends(get_db)
):

    user = get_current_user(token, db)  
    if isinstance(user, RedirectResponse):
        return user
    # Requête SQL avec jointures
    requete = "SELECT * FROM banque WHERE id=:id_banque"
    infos_banque = crud.execute_raw_sql(db,requete, params={"id_banque":user.id_banque})

    if infos_banque:
        banque = infos_banque[0]['sigle']
    else:
        banque = ""

    if banque == "AWA" or banque == "ARW":
        sql_query = """
        SELECT dmd.*, a.max_event
        FROM (SELECT 
            t.libelle AS type_demande,
            t.id AS id_type_demande,
            c.id AS id_categorie_demande,
            c.libelle AS categorie_demande,
            d.nom_client AS nom_client,
            d.montant AS montant,
            d.date AS date,
            d.heure AS heure,
            d.id AS id_demande,
            (d.date || ' ' || d.heure)::timestamp AS date_time,
            b.sigle AS banque
            FROM typedemande t 
            JOIN categoriedemande c ON c.id = t.id_categoriedemande
            JOIN demandes d ON d.id_typedemande = t.id
            JOIN banque b ON b.id = d.banque
            ) dmd
        JOIN (SELECT id_demande, MAX(id_event) AS max_event FROM avis GROUP BY id_demande HAVING MAX(id_event) = 1) a ON a.id_demande = dmd.id_demande 
        ORDER BY dmd.date_time DESC
        """
        params = {"":""}
    else:
        sql_query = """
        SELECT * FROM
        (SELECT dmd.*, a.max_event, a.date_avis, a.heure_avis
        FROM (SELECT 
            t.libelle AS type_demande,
            t.id AS id_type_demande,
            c.id AS id_categorie_demande,
            c.libelle AS categorie_demande,
            d.nom_client AS nom_client,
            d.montant AS montant,
            d.date AS date,
            d.heure AS heure,
            d.id AS id_demande,
            (d.date || ' ' || d.heure)::timestamp AS date_time,
            b.sigle AS banque
            FROM typedemande t 
            JOIN categoriedemande c ON c.id = t.id_categoriedemande
            JOIN demandes d ON d.id_typedemande = t.id
            JOIN banque b ON b.id = d.banque
            WHERE d.banque = :id_banque AND d.id_user <> :id_user) dmd
        JOIN (SELECT id_demande, MAX(date) AS date_avis, MAX(heure) AS heure_avis, MAX(id_event) AS max_event FROM avis GROUP BY id_demande HAVING MAX(id_event) NOT IN (7,8)) a ON a.id_demande = dmd.id_demande 
        ) req1 
        JOIN eventstatut ON eventstatut.id = req1.max_event ORDER BY req1.date_avis DESC
        """
        params = {"id_banque":user.id_banque, "id_user":user.id}

    try:
        result = crud.execute_raw_sql(db, sql_query, params=params)
        return {"results": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# demandes a charger dans la page accueil poour des users en fonction de leurs positions(FILIALES, REGIONAL, GROUP CENTRAL et du domaine de couverture)
@router.get("/demandes_a_consulter/{domaine_user}")
async def get_demandes_user(
    domaine_user : str,
    user: schemas.Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    
    if isinstance(user, RedirectResponse):
        return user
    # Requête SQL avec jointures
    requete = "SELECT * FROM banque WHERE id=:id_banque"
    infos_banque = crud.execute_raw_sql(db,requete, params={"id_banque":user.id_banque})

    if infos_banque:
        banque = infos_banque[0]['sigle']
    else:
        banque = ""

    if banque == "AWA" or banque == "AIG":

        if domaine_user == "ALL":
            sql_query = """
                SELECT dmd.*, a.max_event , a.date_avis, a.heure_avis, eventstatut.description AS description
                FROM (SELECT 
                    t.libelle AS type_demande,
                    t.id AS id_type_demande,
                    c.id AS id_categorie_demande,
                    c.libelle AS categorie_demande,
                    d.nom_client AS nom_client,
                    d.montant AS montant,
                    d.date AS date,
                    d.heure AS heure,
                    d.id AS id_demande,
                    (d.date || ' ' || d.heure)::timestamp AS date_time,
                    b.sigle AS banque
                    FROM typedemande t 
                    JOIN categoriedemande c ON c.id = t.id_categoriedemande
                    JOIN demandes d ON d.id_typedemande = t.id
                    JOIN banque b ON b.id = d.banque
                    ) dmd
                JOIN (SELECT id_demande, MAX(date) AS date_avis, MAX(heure) AS heure_avis, MAX(id_event) AS max_event FROM avis 
                WHERE id_demande NOT IN (SELECT id_demande FROM avis WHERE id_valideur = :user_id)
                GROUP BY id_demande HAVING MAX(id_event) NOT IN (7,8,9)) a ON a.id_demande = dmd.id_demande
                JOIN eventstatut ON eventstatut.id = a.max_event 
                ORDER BY (a.date_avis || ' ' || a.heure_avis)::timestamp DESC
            """
            params = {"user_id":user.id}
        else:
            sql_query = """
            SELECT dmd.*, a.max_event , a.date_avis, a.heure_avis, eventstatut.description AS description
            FROM (SELECT 
                t.libelle AS type_demande,
                t.id AS id_type_demande,
                c.id AS id_categorie_demande,
                c.libelle AS categorie_demande,
                d.nom_client AS nom_client,
                d.montant AS montant,
                d.date AS date,
                d.heure AS heure,
                d.id AS id_demande,
                (d.date || ' ' || d.heure)::timestamp AS date_time,
                b.sigle AS banque
                FROM typedemande t 
                JOIN categoriedemande c ON c.id = t.id_categoriedemande
                JOIN demandes d ON d.id_typedemande = t.id
                JOIN banque b ON b.id = d.banque WHERE c.libelle = :domaine
                ) dmd
            JOIN (SELECT id_demande, MAX(date) AS date_avis, MAX(heure) AS heure_avis, MAX(id_event) AS max_event 
            FROM avis 
            WHERE id_demande NOT IN (SELECT id_demande FROM avis WHERE id_valideur = :user_id)
            GROUP BY id_demande HAVING MAX(id_event) NOT IN (7,8,9)) a ON a.id_demande = dmd.id_demande
            JOIN eventstatut ON eventstatut.id = a.max_event 
            ORDER BY (a.date_avis || ' ' || a.heure_avis)::timestamp DESC
            """
            params = {"domaine":domaine_user, "user_id":user.id}
    else:
        sql_query = """
        SELECT * FROM
        (SELECT dmd.*, a.max_event, a.date_avis, a.heure_avis
        FROM (SELECT 
            t.libelle AS type_demande,
            t.id AS id_type_demande,
            c.id AS id_categorie_demande,
            c.libelle AS categorie_demande,
            d.nom_client AS nom_client,
            d.montant AS montant,
            d.date AS date,
            d.heure AS heure,
            d.id AS id_demande,
            (d.date || ' ' || d.heure)::timestamp AS date_time,
            b.sigle AS banque
            FROM typedemande t 
            JOIN categoriedemande c ON c.id = t.id_categoriedemande
            JOIN demandes d ON d.id_typedemande = t.id
            JOIN banque b ON b.id = d.banque
            WHERE d.banque = :id_banque AND d.id_user <> :id_user AND c.libelle = :domaine) dmd
        JOIN (SELECT id_demande, MAX(date) AS date_avis, MAX(heure) AS heure_avis, MAX(id_event) AS max_event 
        FROM avis 
        WHERE id_demande NOT IN (SELECT id_demande FROM avis WHERE id_valideur = :user_id)
        GROUP BY id_demande HAVING MAX(id_event) NOT IN (7,8,9)) a ON a.id_demande = dmd.id_demande 
        ) req1 
        JOIN eventstatut ON eventstatut.id = req1.max_event ORDER BY (a.date_avis || ' ' || a.heure_avis)::timestamp DESC
        """
        params = {"id_banque":user.id_banque, "id_user":user.id, "domaine":domaine_user}

    try:
        result = crud.execute_raw_sql(db, sql_query, params=params)
        return {"results": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# chargement des demandes à valider pour les profils valideurs
@router.get("/demandes_a_cloturer/")
async def get_demandes_fin_process(
    user: schemas.Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):


    if isinstance(user, RedirectResponse):
        return user
    id_event = 6

    sql_query = """
    SELECT dmd.*, a.max_event, a.date_avis, a.heure_avis 
    FROM (SELECT 
        t.libelle AS type_demande,
        t.id AS id_type_demande,
        c.id AS id_categorie_demande,
        c.libelle AS categorie_demande,
        d.nom_client AS nom_client,
        d.montant AS montant,
        d.date AS date,
        d.heure AS heure,
        d.id AS id_demande,
        (d.date || ' ' || d.heure)::timestamp AS date_time,
        b.sigle AS banque
        FROM typedemande t 
        JOIN categoriedemande c ON c.id = t.id_categoriedemande
        JOIN demandes d ON d.id_typedemande = t.id
        JOIN banque b ON b.id = d.banque
        ) dmd
    JOIN (SELECT id_demande, MAX(date) AS date_avis, Max(heure) AS heure_avis, MAX(id_event) AS max_event FROM avis GROUP BY id_demande HAVING MAX(id_event) = :id_event) a ON a.id_demande = dmd.id_demande 
    """
    params = {"id_event":id_event}
       
    try:
        result = crud.execute_raw_sql(db, sql_query, params=params)
        return {"results": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# chargement des demandes à valider pour les profils valideurs
@router.get("/demandes_a_valider/")
async def get_demandes_a_valider(
    user: schemas.Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    if isinstance(user, RedirectResponse):
        return user
    
    # Requête SQL avec jointures
    requete1 = "SELECT * FROM banque WHERE id=:id_banque"
    infos_banque = crud.execute_raw_sql(db,requete1, params={"id_banque":user.id_banque})

    if infos_banque:
        banque = infos_banque[0]['sigle']
    else:
        banque = ""

    requete2 = "SELECT * FROM entite WHERE id=:id_entite"
    infos_entite = crud.execute_raw_sql(db,requete2, params={"id_entite":user.id_entite})

    if infos_entite:
        entite = infos_entite[0]['libelle']


    if banque == "AWA" or banque == "AIG":
        if banque =="AWA":
            id_event = 3
            sql_query = """
            SELECT dmd.*, a.max_event
            FROM (SELECT 
                t.libelle AS type_demande,
                t.id AS id_type_demande,
                c.id AS id_categorie_demande,
                c.libelle AS categorie_demande,
                d.nom_client AS nom_client,
                d.montant AS montant,
                d.date AS date,
                d.heure AS heure,
                d.id AS id_demande,
                (d.date || ' ' || d.heure)::timestamp AS date_time,
                b.sigle AS banque
                FROM typedemande t 
                JOIN categoriedemande c ON c.id = t.id_categoriedemande
                JOIN demandes d ON d.id_typedemande = t.id
                JOIN banque b ON b.id = d.banque
                ) dmd
            JOIN (SELECT id_demande, MAX(id_event) AS max_event, MAX(heure) AS heure_avis, MAX(date) AS date_avis FROM avis GROUP BY id_demande HAVING MAX(id_event) = :id_event) a ON a.id_demande = dmd.id_demande 
            ORDER BY (a.date_avis || ' ' || a.heure_avis)::timestamp DESC
            """
            params = {"id_event":id_event}
        else:
            if entite == "GGR":
                id_event = 5
                sql_query = """
                SELECT dmd.*, a.max_event
                FROM (SELECT 
                    t.libelle AS type_demande,
                    t.id AS id_type_demande,
                    c.id AS id_categorie_demande,
                    c.libelle AS categorie_demande,
                    d.nom_client AS nom_client,
                    d.montant AS montant,
                    d.date AS date,
                    d.heure AS heure,
                    d.id AS id_demande, 
                    (d.date || ' ' || d.heure)::timestamp AS date_time,
                    b.sigle AS banque
                    FROM typedemande t 
                    JOIN categoriedemande c ON c.id = t.id_categoriedemande
                    JOIN demandes d ON d.id_typedemande = t.id
                    JOIN banque b ON b.id = d.banque) dmd
                JOIN (SELECT id_demande, MAX(date) date_avis, MAX(heure) AS heure_avis , MAX(id_event) AS max_event FROM avis GROUP BY id_demande HAVING MAX(id_event) = :id_event) a ON a.id_demande = dmd.id_demande 
                ORDER BY (a.date_avis || ' ' || a.heure_avis)::timestamp DESC
                """
                params = {"id_event":id_event}
            else:
                id_event = 4
                sql_query = """
                SELECT dmd.*, a.max_event
                FROM (SELECT 
                    t.libelle AS type_demande,
                    t.id AS id_type_demande,
                    c.id AS id_categorie_demande,
                    c.libelle AS categorie_demande,
                    d.nom_client AS nom_client,
                    d.montant AS montant,
                    d.date AS date,
                    d.heure AS heure,
                    d.id AS id_demande,
                    dg.id AS id_departementGroup,
                    dg.libelle AS departemenGroup, 
                    (d.date || ' ' || d.heure)::timestamp AS date_time,
                    b.sigle AS banque
                    FROM typedemande t 
                    JOIN categoriedemande c ON c.id = t.id_categoriedemande
                    JOIN departementgroup dg ON dg.id = c.id_departementgroup
                    JOIN demandes d ON d.id_typedemande = t.id
                    JOIN banque b ON b.id = d.banque
                    WHERE dg.libelle = :entite) dmd
                JOIN (SELECT id_demande, MAX(date) AS date_avis, MAX(heure) AS heure_avis, MAX(id_event) AS max_event FROM avis GROUP BY id_demande HAVING MAX(id_event) = :id_event) a ON a.id_demande = dmd.id_demande 
                ORDER BY (a.date_avis || ' ' || a.heure_avis)::timestamp DESC
                """
                params = {"entite":entite,"id_event":id_event}
    else:
        if entite == "GGR":
            id_event = 1
        else:
            id_event = 2

        sql_query = """
        SELECT dmd.*, a.max_event
        FROM (SELECT 
            t.libelle AS type_demande,
            t.id AS id_type_demande,
            c.id AS id_categorie_demande,
            c.libelle AS categorie_demande,
            d.nom_client AS nom_client,
            d.montant AS montant,
            d.date AS date,
            d.heure AS heure,
            d.id AS id_demande,
            (d.date || ' ' || d.heure)::timestamp AS date_time,
            b.sigle AS banque
            FROM typedemande t 
            JOIN categoriedemande c ON c.id = t.id_categoriedemande
            JOIN demandes d ON d.id_typedemande = t.id
            JOIN banque b ON b.id = d.banque
            WHERE d.banque = :id_banque) dmd
        JOIN (SELECT id_demande, MAX(date) AS date_avis, MAX(heure) AS heure_avis , MAX(id_event) AS max_event FROM avis GROUP BY id_demande HAVING MAX(id_event) = :id_event) a ON a.id_demande = dmd.id_demande 
        ORDER BY (a.date_avis || ' ' || a.heure_avis)::timestamp DESC
        """
        params = {"id_banque":user.id_banque, "id_event":id_event}

    try:
        result = crud.execute_raw_sql(db, sql_query, params=params)
        return {"results": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# chargement des demandes à valider pour les profils valideurs
@router.get("/demandes_deja_valider/")
async def get_demandes_deja_valider(
    user: schemas.Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    
    
    if isinstance(user, RedirectResponse):
        return user
    
    sql_query = """
    SELECT dmd.*
    FROM (SELECT 
        t.libelle AS type_demande,
        t.id AS id_type_demande,
        c.id AS id_categorie_demande,
        c.libelle AS categorie_demande,
        d.nom_client AS nom_client,
        d.montant AS montant,
        d.date AS date,
        d.heure AS heure,
        d.id AS id_demande,
        (d.date || ' ' || d.heure)::timestamp AS date_time,
        b.sigle AS banque
        FROM typedemande t 
        JOIN categoriedemande c ON c.id = t.id_categoriedemande
        JOIN demandes d ON d.id_typedemande = t.id
        JOIN banque b ON b.id = d.banque
        ) dmd
    JOIN (SELECT id_demande, id_event, date AS date_avis, heure AS heure_avis FROM avis WHERE id_valideur = :id_valideur AND id_demande NOT IN (SELECT id_demande FROM avis GROUP BY id_demande HAVING Max(id_event) IN (6,7,8,9)))  a ON a.id_demande = dmd.id_demande 
    ORDER BY (a.date_avis || ' ' || a.heure_avis)::timestamp DESC
    """
    params = {"id_valideur":user.id}
        
    try:
        result = crud.execute_raw_sql(db, sql_query, params=params)
        return {"results": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/demandes/", response_model=List[schemas.Demande])
def read_demandes(skip: int = 0, limit: int = 1000, db: Session = Depends(get_db)):
    demandes = crud.get_demandes(db, skip=skip, limit=limit)
    return demandes

@router.put("/demandes/{demande_id}", response_model=schemas.Demande)
def update_demande(demande_id: int, demande: schemas.DemandeCreate, db: Session = Depends(get_db)):
    return crud.update_demande(db=db, demande_id=demande_id, demande=demande)

@router.delete("/demandes/{demande_id}", response_model=schemas.Demande)
def delete_demande(demande_id: int, db: Session = Depends(get_db)):
    return crud.delete_demande(db=db, demande_id=demande_id)


# avis Endpoints
@router.post("/cloturer_demande/{demande_id}/", response_model=schemas.AvisValidation)
async def cloturer_demande(demande_id: int,
                         id_decision: int = Form(...),
                         commentaire: str = Form(None),
                         user: schemas.Users = Depends(get_current_user),
                         db: Session = Depends(get_db)):
    

    current_date = datetime.now().strftime("%Y-%m-%d")  # Format YYYY-MM-DD
    current_heure = datetime.now().strftime("%H:%M:%S")    # Format HH:MM:SS

    id_niveauValidation = 3
    id_event = 7

    # Créer un objet avis
    avis_data = {
        "commentaire": commentaire,
        "date": current_date,
        "heure": current_heure,
        "id_demande": demande_id,
        "id_event": id_event,
        "id_valideur": user.id,
        "id_decision": id_decision,
        "id_niveauValidation": id_niveauValidation
    }

    try:
        db_demande = crud.create_avis(db=db, avis=schemas.AvisCreate(**avis_data))
        logger.info("Demande cloturée avec succès")
        return db_demande
    except Exception as e:
        logger.error(f"Erreur lors de la validation de la demande: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de la validarion de la demande : {str(e)}")


# avis Endpoints
@router.post("/valider_avis/{demande_id}/process_ongoing/{process_ongoing}", response_model=schemas.AvisValidation)
async def valider_avis(demande_id: int,
                         process_ongoing: int,
                         user: schemas.Users = Depends(get_current_user),
                         id_decision: int = Form(...),
                         commentaire: str = Form(None),
                         db: Session = Depends(get_db)):
    
    
    current_date = datetime.now().strftime("%Y-%m-%d")  # Format YYYY-MM-DD
    current_heure = datetime.now().strftime("%H:%M:%S")    # Format HH:MM:SS


    requete1 = "SELECT * FROM banque WHERE id=:id_banque"
    requete2 = "SELECT * FROM entite WHERE id=:id_entite"

    infos_banque = crud.execute_raw_sql(db,requete1, params={"id_banque":user.id_banque})
    infos_entite = crud.execute_raw_sql(db,requete2, params={"id_entite":user.id_entite})

    if infos_banque[0]['sigle'] == "AWA" or infos_banque[0]['sigle'] == "AIG":
        if infos_banque[0]['sigle'] == "AWA":
            id_niveauValidation = 3
            id_event = 4
        else:
            id_niveauValidation = 3
            if infos_entite[0]['libelle'] == "GGR":
                id_event = 6
            else:
                id_event = 5
    else:
        id_niveauValidation = 2
        if infos_entite[0]['libelle'] == "DG":
            if process_ongoing == 1:
                id_event = 3
            else:
                id_event = 9
        elif infos_entite[0]['libelle'] == "GGR":
            id_event = 2

    # Créer un objet avis
    avis_data = {
        "commentaire": commentaire,
        "date": current_date,
        "heure": current_heure,
        "id_demande": demande_id,
        "id_event": id_event,
        "id_valideur": user.id,
        "id_decision": id_decision,
        "id_niveauValidation": id_niveauValidation
    }

    try:
        db_demande = crud.create_avis(db=db, avis=schemas.AvisCreate(**avis_data))
        logger.info("Demande modifiée dans la base de données")
        return db_demande
    except Exception as e:
        logger.error(f"Erreur lors de la validarion de la demande: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de la validarion de la demande : {str(e)}")


@router.post("/avis/", response_model=schemas.Avis)
def create_avis(avis: schemas.AvisCreate, db: Session = Depends(get_db)):
    return crud.create_avis(db=db, avis=avis)

@router.get("/avis/{avis_id}", response_model=schemas.Avis)
def read_avis(avis_id: int, db: Session = Depends(get_db)):
    db_avis = crud.get_avis(db, avis_id=avis_id)
    if db_avis is None:
        raise HTTPException(status_code=404, detail="Avis not found")
    return db_avis

@router.get("/avis/", response_model=List[schemas.Avis])
def read_avis_list(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    avis = crud.get_avis_list(db, skip=skip, limit=limit)
    return avis

@router.put("/avis/{avis_id}", response_model=schemas.Avis)
def update_avis(avis_id: int, avis: schemas.AvisCreate, db: Session = Depends(get_db)):
    return crud.update_avis(db=db, avis_id=avis_id, avis=avis)

@router.delete("/avis/{avis_id}", response_model=schemas.Avis)
def delete_avis(avis_id: int, db: Session = Depends(get_db)):
    return crud.delete_avis(db=db, avis_id=avis_id)

# poste Endpoints
@router.post("/poste/", response_model=schemas.Poste)
def create_poste(poste: schemas.PosteCreate, db: Session = Depends(get_db)):
    return crud.create_poste(db=db, poste=poste)

@router.get("/poste/poste_id}", response_model=schemas.Poste)
def read_poste(poste_id: int, db: Session = Depends(get_db)):
    db_poste = crud.get_avis(db, poste_id=poste_id)
    if db_poste is None:
        raise HTTPException(status_code=404, detail="Poste not found")
    return db_poste

@router.get("/postes/", response_model=List[schemas.Poste])
def read_postes_list(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    postes = crud.get_postes(db, skip=skip, limit=limit)
    return postes

@router.put("/poste/{poste_id}", response_model=schemas.Poste)
def update_poste(poste_id: int, poste: schemas.PosteCreate, db: Session = Depends(get_db)):
    return crud.update_poste(db=db, poste_id=poste_id, poste=poste)

@router.delete("/poste/{poste_id}", response_model=schemas.Poste)
def delete_avis(poste_id: int, db: Session = Depends(get_db)):
    return crud.delete_poste(db=db, poste_id=poste_id)

# poste decisions
@router.post("/decision/", response_model=schemas.Decision)
def create_decision(decision: schemas.DecisionCreate, db: Session = Depends(get_db)):
    return crud.create_decision(db=db, decision=decision)

@router.get("/decision/decision_id}", response_model=schemas.Decision)
def read_poste(decision_id: int, db: Session = Depends(get_db)):
    db_decision = crud.get_decision(db, decision_id=decision_id)
    if db_decision is None:
        raise HTTPException(status_code=404, detail="Poste not found")
    return db_decision

@router.get("/decisions/", response_model=List[schemas.Decision])
def read_decisions_list(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    decisions = crud.get_decisions(db, skip=skip, limit=limit)
    return decisions

@router.put("/decision/{decision_id}", response_model=schemas.Decision)
def update_poste(decision_id: int, decision: schemas.DecisionCreate, db: Session = Depends(get_db)):
    return crud.update_poste(db=db, decision_id=decision_id, decision=decision)

@router.delete("/decision/{decision_id}", response_model=schemas.Decision)
def delete_avis(decision_id: int, db: Session = Depends(get_db)):
    return crud.delete_poste(db=db, decision_id=decision_id)

# commentaires sur les demandes

@router.post("/commentaires/", response_model=schemas.Commentaires)
def create_commentaires(commentaires: schemas.CommentairesCreate, db: Session = Depends(get_db)):
    return crud.create_commentaires(db=db, commentaires=commentaires)

@router.get("/commentaires/{commentaires_id}", response_model=schemas.Commentaires)
def read_commentaires(commentaires_id: int, db: Session = Depends(get_db)):
    db_commentaires = crud.get_commentaires(db, commentaires_id=commentaires_id)
    if db_commentaires is None:
        raise HTTPException(status_code=404, detail="Commentaires not found")
    return db_commentaires

@router.get("/commentaires/", response_model=List[schemas.Commentaires])
def read_commentaires_list(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    commentaires = crud.get_commentaires_list(db, skip=skip, limit=limit)
    return commentaires

@router.put("/commentaires/{commentaires_id}", response_model=schemas.Commentaires)
def update_commentaires(commentaires_id: int, commentaires: schemas.CommentairesCreate, db: Session = Depends(get_db)):
    return crud.update_commentaires(db=db, commentaires_id=commentaires_id, commentaires=commentaires)

@router.delete("/commentaires/{commentaires_id}", response_model=schemas.Commentaires)
def delete_commentaires(commentaires_id: int, db: Session = Depends(get_db)):
    return crud.delete_commentaires(db=db, commentaires_id=commentaires_id)


# domaine

@router.post("/domaine/", response_model=schemas.Domaine)
def create_domaine(domaine: schemas.DomaineCreate, db: Session = Depends(get_db)):
    return crud.create_domaine(db=db, domaine=domaine)

@router.get("/domaine/{domaine_id}", response_model=schemas.Domaine)
def read_domaine(domaine_id: int, db: Session = Depends(get_db)):
    db_domaine = crud.get_domaine(db, domaine_id=domaine_id)
    if db_domaine is None:
        raise HTTPException(status_code=404, detail="Domaine not found")
    return db_domaine

@router.get("/domaine/", response_model=List[schemas.Domaine])
def get_all_domaine(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    domaine = crud.get_all_domaine(db, skip=skip, limit=limit)
    return domaine

@router.put("/domaine/{domaine_id}", response_model=schemas.Domaine)
def update_domaine(domaine_id: int, domaine: schemas.DomaineCreate, db: Session = Depends(get_db)):
    return crud.update_domaine(db=db, domaine_id=domaine_id, domaine=domaine)

@router.delete("/domaine/{domaine_id}", response_model=schemas.Domaine)
def delete_domaine(domaine_id: int, db: Session = Depends(get_db)):
    return crud.delete_domaine(db=db, domaine_id=domaine_id)

# chemin pour enregistrer une entrer un commentaire dans le chat
@router.post("/commenter/", response_model=schemas.Commentaires)
async def inserer_commentaire(id_user: int = Form(...),
                         commentaire: str = Form(...),
                         demande_id: int = Form(...), 
                         db: Session = Depends(get_db)):
    
    logger.info(f"Reçu demande: id_user={id_user}, commentaire={commentaire}, demande_id={demande_id}")
    
    current_date = datetime.now().strftime("%Y-%m-%d")  # Format YYYY-MM-DD
    current_heure = datetime.now().strftime("%H:%M:%S")    # Format HH:MM:SS

    # Créer un objet DemandeCreate
    commentaire_data = {
        "id_user": id_user,
        "commentaire": commentaire,
        "date_creation": current_date,
        "heure_creation": current_heure,
        "updated_date": current_date,
        "updated_heure": current_heure,
        "demande_id": demande_id
    }

    comm = schemas.CommentairesBase(**commentaire_data)

    try:
        db_commentaire = crud.create_commentaire(db=db, usercomm=comm)
        logger.info("Demande créée dans la base de données")
        return db_commentaire
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la création du commentaire : {str(e)}")
    
@router.get("/messages_chat/{id_demande}")
async def get_messages_staff(
    id_demande : int,
    user: schemas.Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    
    if isinstance(user, RedirectResponse):
        return user
    # Requête SQL avec jointures
    requete = "SELECT * FROM commentaires " \
    " JOIN users ON commentaires.id_user = users.id WHERE commentaires.demande_id=:id_demande ORDER BY (commentaires.date_creation || ' ' || commentaires.heure_creation)::timestamp ASC"
    parametres = {"id_demande":id_demande}

    try:
        result = crud.execute_raw_sql(db, requete, params=parametres)
        return {"results": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))