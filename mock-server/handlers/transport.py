"""Mapping with WebSockets and Google Maps."""
import json
import logging
from tornado.web import RequestHandler
from tornado import gen

with open("static/home_to_work.json") as f:
    data_home = json.load(f)

with open("static/work_to_home.json") as f:
    data_work = json.load(f)


class Arrivals(RequestHandler):
    """Mock TransportAPI arrivals resposne."""

    @gen.coroutine
    def get(self, to_home):
        """Render index page."""
        logging.info('Mocking data with home_state={}'.format(to_home))
        if to_home == 'true':
            json_data = data_home
        else:
            json_data = data_work
        self.write(json_data)
