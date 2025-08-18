from datetime import datetime

def get_unique_months(dates):
    ym_set = {d[:7] for d in dates}
    return sorted(ym_set, key=lambda x: datetime.strptime(x, "%Y-%m"))