from datetime import datetime

_mid = 0; _cid = 0
meetings: dict = {}; contacts: dict = {}; chat_history: list = []
 
def next_mid():
    global _mid; _mid += 1; return _mid

def next_cid():
    global _cid; _cid += 1; return _cid
 
def seed_meetings():
    today = datetime.today().strftime("%Y-%m-%d")
    for s in [
        {"title":"Product Sync","type":"Internal","platform":"Google Meet","participants":"sarah@co.com, mike@co.com","date":today,"time":"10:00","duration":30,"link":"https://meet.google.com/abc"},
        {"title":"Client: TechCorp","type":"External","platform":"Phone","participants":"alex@techcorp.com","date":today,"time":"14:30","duration":45,"link":""},
        {"title":"Sprint Retro","type":"Recurring","platform":"Zoom","participants":"emma@co.com, david@co.com","date":today,"time":"16:00","duration":60,"link":"https://zoom.us/j/123"},
        {"title":"Design Review","type":"Review","platform":"Google Meet","participants":"david@co.com","date":"2026-03-20","time":"11:00","duration":30,"link":""},
        {"title":"1:1 with Emma","type":"Internal","platform":"Teams","participants":"emma@co.com","date":"2026-03-21","time":"09:30","duration":30,"link":""},
    ]:
        mid = next_mid()
        meetings[mid] = {"id": mid, **s, "created_at": datetime.now().isoformat(), "updated_at": datetime.now().isoformat()}

def seed_contacts():
    today = datetime.today().strftime("%Y-%m-%d")
    for s in [
        {"first_name":"Emma","last_name":"Watson","email":"emma@co.com","phone":"+1 (555) 100-0001","role":"Marketing Lead","company":"Internal","status":"Active","last_contact":today,"notes":"Key marketing stakeholder. Weekly sync every Monday."},
        {"first_name":"David","last_name":"Chen","email":"david@co.com","phone":"+1 (555) 100-0002","role":"Designer","company":"Internal","status":"Active","last_contact":"2026-03-10","notes":"Design Director. Prefers async communication."},
        {"first_name":"Alex","last_name":"Thomas","email":"alex@techcorp.com","phone":"+1 (555) 200-0003","role":"Product Manager","company":"TechCorp","status":"Active","last_contact":"2026-03-12","notes":"Primary TechCorp contact for Q1 project."},
        {"first_name":"Sarah","last_name":"Kim","email":"sarah@co.com","phone":"+1 (555) 100-0004","role":"Developer","company":"Internal","status":"Active","last_contact":"2026-03-13","notes":"Senior engineer on the platform team."},
        {"first_name":"Michael","last_name":"Rivera","email":"mike@co.com","phone":"+1 (555) 100-0005","role":"Operations","company":"Internal","status":"Pending","last_contact":"2026-02-28","notes":"Joining the ops team next month."},
        {"first_name":"Jennifer","last_name":"Lee","email":"jen@marketinghub.com","phone":"+1 (555) 300-0006","role":"Marketing Lead","company":"MarketingHub","status":"Active","last_contact":"2026-03-05","notes":"Partnership contact for co-marketing initiatives."},
        {"first_name":"Robert","last_name":"Fox","email":"rob@techcorp.com","phone":"+1 (555) 200-0007","role":"Developer","company":"TechCorp","status":"Active","last_contact":"2026-03-11","notes":"Backend lead at TechCorp."},
        {"first_name":"Priya","last_name":"Sharma","email":"priya@co.com","phone":"+1 (555) 100-0008","role":"Designer","company":"Internal","status":"Inactive","last_contact":"2026-01-15","notes":"On extended leave until Q2."},
    ]:
        cid = next_cid()
        contacts[cid] = {"id": cid, **s, "avatar_url": "", "created_at": datetime.now().isoformat(), "updated_at": datetime.now().isoformat()}

seed_meetings()
seed_contacts()
