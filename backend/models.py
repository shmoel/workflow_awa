from sqlalchemy import Boolean, Column, Integer, PrimaryKeyConstraint, String, ForeignKey, Float, Date, Time
from .database import Base

# TABLES MERES

class Poste(Base):
    __tablename__ = "poste"
    id = Column(Integer, primary_key=True, autoincrement=True)
    libelle = Column(String)
    
class Decision(Base):
    __tablename__ = "decision"
    id = Column(Integer, primary_key=True, autoincrement=True)
    libelle = Column(String)

class Localisation(Base):
    __tablename__ = "localisation"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    pays = Column(String)
    capitale = Column(String)
    sigle_pays = Column(String)

class NiveauHab(Base):
    __tablename__ = "niveauhab"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    code = Column(String)
    description = Column(String)

class DepartementGroup(Base):
    __tablename__ = "departementgroup"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    libelle = Column(String)

class EventStatut(Base):
    __tablename__ = "eventstatut"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    libelle = Column(String)
    description = Column(String)

class TypeInstitution(Base):
    __tablename__ = "typeinstitution"
    id = Column(Integer, primary_key=True, autoincrement=True)
    libelle = Column(String)

class Entite(Base):
    __tablename__ = "entite"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    libelle = Column(String)
    description = Column(String)

class NiveauValidation(Base):
    __tablename__ = "niveauvalidation"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    libelle = Column(String)
    niveau = Column(String)

# TABLES FILLES

class CategorieDemande(Base):
    __tablename__ = "categoriedemande"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    libelle = Column(String)
    id_departementgroup = Column(Integer, ForeignKey("departementgroup.id", onupdate='CASCADE', ondelete='CASCADE'))

class Typedemande(Base):
    __tablename__ = 'typedemande'
    id = Column(Integer, primary_key= True, autoincrement=True)
    libelle = Column(String)
    id_categoriedemande = Column(Integer, ForeignKey("categoriedemande.id", onupdate='CASCADE', ondelete='CASCADE'), index=True)

class Banque(Base):
    __tablename__ = "banque"
    id = Column(Integer,primary_key=True, index=True,autoincrement=True)
    sigle = Column(String)
    nom = Column(String)
    id_loc = Column(Integer, ForeignKey("localisation.id", ondelete='CASCADE', onupdate='CASCADE'), index=True) 
    id_type_instit = Column(Integer, ForeignKey("typeinstitution.id", ondelete='CASCADE', onupdate='CASCADE'), index=True)


class Users(Base):
    __tablename__="users"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    username = Column(String, unique=True, index=True)
    nom = Column(String)
    prenom = Column(String)
    hashed_password = Column(String)
    password = Column(String)
    email = Column(String,unique=True)
    id_banque = Column(Integer, ForeignKey("banque.id", ondelete='CASCADE', onupdate='CASCADE'), index=True)
    id_niv_hab = Column(Integer, ForeignKey("niveauhab.id", ondelete='CASCADE', onupdate='CASCADE'), index=True)
    id_entite = Column(Integer, ForeignKey("entite.id", ondelete='CASCADE', onupdate='CASCADE'), index=True)
    id_poste = Column(Integer, ForeignKey('poste.id', ondelete='CASCADE', onupdate='CASCADE'), index=True)

class Demande(Base):
    __tablename__ = "demandes"
    id = Column(Integer, primary_key=True, autoincrement=True)
    commentaire_intro = Column(String)
    commentaire_risque_region = Column(String)
    commentaire_dga_region = Column(String)
    commentaire_dg_central = Column(String)
    nom_client = Column(String,index=True)
    note_analyse = Column(String)
    montant = Column(Float, index=True)
    date = Column(Date, index=True)
    heure= Column(Time, index=True)
    banque = Column(Integer, ForeignKey('banque.id', ondelete='CASCADE', onupdate='CASCADE'), index=True)
    id_user = Column(Integer, ForeignKey('users.id', onupdate='CASCADE', ondelete='CASCADE'), index= True)
    id_typedemande = Column(Integer, ForeignKey('typedemande.id', ondelete='CASCADE', onupdate='CASCADE'), index=True)

class Avis(Base):
    __tablename__ = "avis"
    id = Column(Integer, primary_key=True, autoincrement=True)
    commentaire = Column(String)
    date = Column(Date, index=True)
    heure= Column(Time, index=True)
    id_demande = Column(Integer, ForeignKey("demandes.id", ondelete='CASCADE', onupdate='CASCADE'), index=True)    
    id_event = Column(Integer, ForeignKey("eventstatut.id", ondelete='CASCADE', onupdate='CASCADE'), index=True)
    id_valideur = Column(Integer, ForeignKey("users.id", ondelete='CASCADE', onupdate='CASCADE'), index=True)
    id_decision = Column(Integer, ForeignKey("decision.id", ondelete='CASCADE', onupdate='CASCADE'), index=True)
    id_niveauValidation = Column(Integer, ForeignKey("niveauvalidation.id", ondelete='CASCADE', onupdate='CASCADE'), index=True)

class Commentaires(Base):
    __tablename__ = "commentaires"
    id = Column(Integer, primary_key=True, autoincrement=True)
    id_user = Column(Integer, ForeignKey('users.id', onupdate='CASCADE', ondelete='CASCADE'), index= True)
    commentaire = Column(String)
    date_creation = Column(Date, index=True)
    heure_creation= Column(Time, index=True)
    updated_date = Column(Date, index=True)
    updated_heure = Column(Time, index=True)
    demande_id = Column(Integer, ForeignKey("demandes.id", ondelete='CASCADE', onupdate='CASCADE'), index=True)    

class Domaine(Base):
    __tablename__ = "domaine"
    id = Column(Integer, primary_key=True, autoincrement=True)
    libelle = Column(String)
   
class UserDomaine(Base):
    __tablename__ = "user_domaine"

    user_id = Column(Integer, index = True, nullable=False)
    domaine_id = Column(Integer, index=True, nullable=False)
    __table_args__ = (
        PrimaryKeyConstraint('user_id', 'domaine_id', name='pk_user_domaine'),)
   