"""Main Tornado app."""
from tornado import gen
from tornado.options import parse_command_line
from tornado.httpserver import HTTPServer
from tornado.ioloop import IOLoop
from tornado.web import Application
import logging
from tornado.options import options
from settings import settings
from urls import url_patterns


class TornadoApp(Application):
    """Tornado Applition + rethinkDB + settings."""

    def __init__(self):
        """Init function."""
        Application.__init__(self, url_patterns, **settings)


@gen.coroutine
def main():
    """Main function."""
    logging.info('Parsing command line')
    parse_command_line()
    if options.debug is True:
        logging.getLogger().setLevel(logging.DEBUG)
        logging.info('Running in debug mode')
    else:
        logging.getLogger().setLevel(logging.INFO)

    # Single db connection for everything thanks a lot Ben and Jeese
    logging.info('starting server on port ' + str(options.port))
    http_server = HTTPServer(TornadoApp())
    http_server.listen(options.port, options.host)


if __name__ == "__main__":
    IOLoop.current().run_sync(main)
    IOLoop.current().start()
