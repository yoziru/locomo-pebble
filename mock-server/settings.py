"""Tornado app settings."""
import os
from tornado.options import define, options, parse_command_line

define("host", default='0.0.0.0', help="run on the given host", type=str)
define("port", default=5000, help="run on the given port", type=int)
define("debug", default=True, help="run in debug mode")
parse_command_line()

settings = dict(cookie_secret="86648e5df6a3974c8352e7ffaf7b68c7",
                template_path=os.path.join(
                    os.path.dirname(__file__), "templates"),
                static_path=os.path.join(
                    os.path.dirname(__file__), "static"),
                xsrf_cookies=False,
                debug=options.debug)
