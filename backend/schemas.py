from typing import Optional
from pydantic import BaseModel, Field, field_validator
from datetime import date, time, datetime


class Token(BaseModel):
    access_token: str
    token_type: str
    
class EntiteBase(BaseModel):
    libelle: str
    description: str

class EntiteCreate(EntiteBase):
    pass

class Entite(EntiteBase):
    id: int
    class Config:
        from_attributes = True

class EventStatutBase(BaseModel):
    libelle: str
    description: str

class EventStatutCreate(EventStatutBase):
    pass

class EventStatut(EventStatutBase):
    id: int
    class Config:
        from_attributes = True

class NiveauValidationBase(BaseModel):
    libelle: str
    niveau: str

class NiveauValidationCreate(NiveauValidationBase):
    pass

class NiveauValidation(NiveauValidationBase):
    id: int
    class Config:
        from_attributes =True

class DepartementGroupBase(BaseModel):
    libelle: str

class DepartementGroupCreate(DepartementGroupBase):
    pass

class DepartementGroup(DepartementGroupBase):
    id: int
    class Config:
        from_attributes =True

class PosteBase(BaseModel):
    libelle: str

class PosteCreate(PosteBase):
    pass

class Poste(PosteBase):
    id: int
    class Config:
        from_attributes =True

class DecisionBase(BaseModel):
    libelle: str

class DecisionCreate(DecisionBase):
    pass

class Decision(DecisionBase):
    id: int
    class Config:
        from_attributes =True

class TypeInstitutionBase(BaseModel):
    libelle: str

class TypeInstitutionCreate(TypeInstitutionBase):
    pass    

class TypeInstitution(TypeInstitutionBase):
    id: int
    class Config:
        from_attributes = True

class NiveauHabBase(BaseModel):
    code: str
    description: str

class NiveauHabCreate(NiveauHabBase):
    pass

class NiveauHab(NiveauHabBase):
    id: int
    class Config:
        from_attributes =True

class LocalisationBase(BaseModel):
    pays: str
    capitale: str
    sigle_pays: str

class LocalisationCreate(LocalisationBase):
    pass

class Localisation(LocalisationBase):
    id: int
    class Config:
        from_attributes =True

class BanqueBase(BaseModel):
    sigle: str
    nom: str
    id_loc: int
    id_type_instit: int

class BanqueCreate(BanqueBase):
    pass

class Banque(BanqueBase):
    id: int
    class Config:
        from_attributes = True

class TypeDemandeBase(BaseModel):
    libelle: str
    id_categorieDemande: int

class TypeDemandeCreate(TypeDemandeBase):
    pass

class TypeDemande(TypeDemandeBase):
    id: int
    class Config:
        from_attributes = True

class CategorieDemandeBase(BaseModel):
    libelle: str
    id_departementGroup: int

class CategorieDemandeCreate(CategorieDemandeBase):
    pass

class CategorieDemande(CategorieDemandeBase):
    id: int
    class Config:
        from_attributes = True

class UsersBase(BaseModel):
    username: str
    nom: Optional[str] = None
    prenom: Optional[str] = None
    password: str
    email: str
    id_banque: int
    id_niv_hab: int
    id_entite: int
    id_poste: int

class UsersCreate(UsersBase):
    pass

class Users(UsersBase):
    id: int
    hashed_password: str
    class Config:
        from_attributes = True

class DemandeBase(BaseModel):
    id_user: int
    banque: int
    nom_client: str
    montant: float
    id_typedemande: int
    commentaire_intro: Optional[str] = None
    note_analyse: Optional[str] = None

class DemandeForUpdate(BaseModel):
    id_user: int
    banque: int
    nom_client: str
    montant: float
    id_typedemande: int
    commentaire_intro: Optional[str] = None


class DemandeCreate(DemandeBase):    
    date: Optional[datetime] = None
    heure: Optional[time]  = None
    pass

class Demande(DemandeCreate):
    id: int
    
    class Config:
        from_attributes = True

class AvisBase(BaseModel):
    commentaire: Optional[str] = None
    date: date
    heure: time
    id_demande: int    
    id_event: int
    id_valideur: int
    id_decision: int
    id_niveauValidation: int

class AvisValidation(BaseModel):
    commentaire: Optional[str] = None
    id_decision: int

class AvisCreate(AvisBase):
    pass

class Avis(AvisBase):
    id: int
    class Config:
        from_attributes = True


class CommentairesBase(BaseModel):
    commentaire: Optional[str] = None
    id_user: int
    date_creation: date
    heure_creation: time
    updated_date: date
    updated_heure: time
    demande_id: int  

class CommentairesCreate(CommentairesBase):
    pass

class Commentaires(CommentairesBase):
    id: int
    class Config:
        from_attributes = True

class DomaineBase(BaseModel):
    libelle: str
  
class DomaineCreate(DomaineBase):
    pass

class Domaine(DomaineBase):
    id: int
    class Config:
        from_attributes = True

class UserDomaineBase(BaseModel):
    user_id: int
    domaine_id: int

    class Config:
        from_attributes = True
  
class UserDomaineCreate(DomaineBase):
    pass

class UserDomaine(DomaineBase):
    pass