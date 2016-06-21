"""URL patterns."""
from handlers.transport import *

url_patterns = [
    (r'/transport/(?P<to_home>[a-z]+)', Arrivals)
]
