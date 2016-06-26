// Include
#include <pebble.h>
#include "libs/pebble-assist/pebble-assist.h"
#include "libs/data-processor/data-processor.h"
#include "libs/message-queue/message-queue.h"

// Define
#define KEY_GROUP 10000
#define KEY_OPERATION 10001
#define KEY_DATA 10002

static Window *s_main_window;
static Layer *horizontal_ruler_layer;
static TextLayer *text_layer_background;
static TextLayer *text_layer_station_to;
static TextLayer *text_layer_platform;
static TextLayer *text_layer_platform_label;
static TextLayer *text_layer_prediction;
static TextLayer *text_layer_prediction_label;
static TextLayer *text_layer_departure_arrival;
static TextLayer *text_layer_status;
static TextLayer *text_layer_indicator;
static StatusBarLayer *s_status_bar;

static int pos = 0;
static int bgcolor_changed = 0;

typedef struct {
  char* est_time;
  char* departure;
  char* arrival;
  char* destination;
  char* status;
  char* platform;
} TrainDeparture;

static TrainDeparture** departures;
static uint8_t num_departures = 0;
static int16_t countdown_int = -1;
static bool is_initialized = false;
static bool switch_state = false;

void destroy_departures(void) {
  for (uint8_t d = 0; d < num_departures; d += 1) {
    free_safe(departures[d]->est_time);
    free_safe(departures[d]->departure);
    free_safe(departures[d]->arrival);
    free_safe(departures[d]->destination);
    free_safe(departures[d]->platform);
    free_safe(departures[d]->status);
    free_safe(departures[d]);
  }
  printf("Departure detail destroyed: %zu bytes used", heap_bytes_used());
  free_safe(departures);
  num_departures = 0;
  printf("Departures destroyed: %zu bytes used", heap_bytes_used());
}


bool train_departure_is_ok(TrainDeparture* departure) {
  bool status_ok = false;
  status_ok = status_ok || strcmp(departure->status, "ON TIME") == 0;
  status_ok = status_ok || strcmp(departure->status, "STARTS HERE") == 0;
  status_ok = status_ok || strcmp(departure->status, "EARLY") == 0;
  status_ok = status_ok || strcmp(departure->status, "NO REPORT") == 0;
  return status_ok;
  printf("Train departure bool: %zu bytes used", heap_bytes_used());
}

void update_countdown(void){
  if (num_departures > 0) {
    if (countdown_int == -1) {
      DEBUG("Writing timer countdown integer");
      countdown_int = atoi(departures[pos]->est_time);
      if (countdown_int <= 0) {
        DEBUG("Countdown is already at zero. Unsubscribing from timer.");
        tick_timer_service_unsubscribe();
      }
    } else if (countdown_int == 0) {
      DEBUG("Finished countdown. Unsubscribing from timer.");
      vibes_double_pulse();
      tick_timer_service_unsubscribe();
    } else {
      printf("Minute tick.");
      static char buf[16];
      countdown_int -= 1;
      snprintf(buf, sizeof(buf), "%d", countdown_int);
      text_layer_set_text(text_layer_prediction, buf);
    }
  }
}

static void tick_handler(struct tm *tick_time, TimeUnits units_changed) {
  update_countdown();
}

void update_text(void) {
  tick_timer_service_unsubscribe();

  static char buf[16];
  snprintf(buf, sizeof(buf), "%s %s %s", departures[pos]->departure, PBL_IF_COLOR_ELSE("\u2192", ">"), departures[pos]->arrival);
  text_layer_set_text(text_layer_prediction, departures[pos]->est_time);
  text_layer_set_text(text_layer_status, departures[pos]->status);
  text_layer_set_text(text_layer_station_to, departures[pos]->destination);
  text_layer_set_text(text_layer_departure_arrival, buf);
  text_layer_set_text(text_layer_platform, departures[pos]->platform);
  static char buf2[16];
  snprintf(buf2, sizeof(buf2), "%i/%i", pos+1, num_departures);
  text_layer_set_text(text_layer_indicator, buf2);

  if (!train_departure_is_ok(departures[pos]) && (bgcolor_changed != 1)) {
    status_bar_layer_set_colors(s_status_bar, GColorDarkCandyAppleRed, GColorWhite);
    text_layer_set_background_color(text_layer_background, GColorDarkCandyAppleRed);
    bgcolor_changed = 1;
  } else if (train_departure_is_ok(departures[pos]) && bgcolor_changed != 0) {
    status_bar_layer_set_colors(s_status_bar, GColorElectricUltramarine, GColorWhite);
    text_layer_set_background_color(text_layer_background, GColorElectricUltramarine);
    bgcolor_changed = 0;
  }

  countdown_int = -1;
  tick_timer_service_subscribe(MINUTE_UNIT, tick_handler);

  printf("Text updated: %zu bytes used", heap_bytes_used());
}

static void handle_departures(char* data) {
  destroy_departures();
  printf("Departures destroy: %zu bytes used", heap_bytes_used());

  data_processor_init(data, '|');
  printf("Data processed: %zu bytes used", heap_bytes_used());
  num_departures = data_processor_get_int();
  departures = malloc(sizeof(TrainDeparture*) * num_departures);
  for (uint8_t d = 0; d < num_departures; d += 1) {
    TrainDeparture* departure = malloc(sizeof(TrainDeparture));
    if (departure == NULL) {
      break;
    }
    departure->est_time = data_processor_get_string();
    departure->departure = data_processor_get_string();
    departure->arrival = data_processor_get_string();
    departure->destination = data_processor_get_string();
    departure->platform = data_processor_get_string();
    departure->status = data_processor_get_string();
    departures[d] = departure;
  }
  printf("Departures processed: %zu bytes used", heap_bytes_used());

  update_text();
  is_initialized = true;
}

static void handle_errors(char* data) {
  destroy_departures();

  data_processor_init(data, '|');

  WARN(data);
  PBL_IF_COLOR_ELSE(
    text_layer_set_text(text_layer_status, "\U0001F635 \U0001F525 ERROR \U0001F525 \U0001F635"),
    text_layer_set_text(text_layer_status, "\U0001F635 ERROR \U0001F635")
  );
  text_layer_set_text(text_layer_departure_arrival, data);

  status_bar_layer_set_colors(s_status_bar, GColorChromeYellow, GColorWhite);
  text_layer_set_background_color(text_layer_background, GColorChromeYellow);
  bgcolor_changed = 2;
  is_initialized = true;
}

static void handle_info(char* data) {
  destroy_departures();

  data_processor_init(data, '|');
  text_layer_set_text(text_layer_status, "INFO");
  text_layer_set_text(text_layer_departure_arrival, data);

  //status_bar_layer_set_colors(s_status_bar, GColorChromeYellow, GColorWhite);
  //text_layer_set_background_color(text_layer_background, GColorChromeYellow);
  //bgcolor_changed = 2;
}

static void message_handler(char* operation, char* data) {
  if (strcmp(operation, "DEPARTURES") == 0) {
    handle_departures(data);
  } else if (strcmp(operation, "ERROR") == 0) {
    handle_errors(data);
  } else if (strcmp(operation, "INFO") == 0 && !is_initialized) {
    handle_info(data);
  }
}

static void refresh_data(void) {
  tick_timer_service_unsubscribe();

  printf("Data refresh started: %zu bytes used", heap_bytes_used());
  static char buf[5];
  snprintf(buf, sizeof(buf), "%s", switch_state ?"true" : "false");
  mqueue_add("TRAIN", "UPDATE", buf);
  text_layer_set_text(text_layer_status, "REFRESHING");
  printf("Data refresh complete: %zu bytes used", heap_bytes_used());

  countdown_int = -1;
  tick_timer_service_subscribe(MINUTE_UNIT, tick_handler);
}

void switch_data(void) {
  tick_timer_service_unsubscribe();

  switch_state = !switch_state;
  pos = 0;
  printf("Switching stations started: %zu bytes used", heap_bytes_used());
  static char buf[5];
  snprintf(buf, sizeof(buf), "%s", switch_state ?"true" : "false");
  mqueue_add("TRAIN", "SWITCH", buf);
  text_layer_set_text(text_layer_status, "SWITCHING");
  printf("Switching stations complete: %zu bytes used", heap_bytes_used());

  countdown_int = -1;
  tick_timer_service_subscribe(MINUTE_UNIT, tick_handler);
}

void select_single_click_handler(ClickRecognizerRef recognizer, Window *window) {
  switch_data();
}

void up_single_click_handler(ClickRecognizerRef recognizer, Window *window) {
  if (pos == 0) {
    refresh_data();
  } else if (pos - 1 >= 0) {
    pos -= 1;
    update_text();
  }
}

void down_single_click_handler(ClickRecognizerRef recognizer, Window *window) {
  //printf("%i / %i", pos + 2, num_departures);
  if (pos + 2 <= num_departures) {
    pos += 1;
    update_text();
  }
}

void config_provider(Window *window) {
  const uint8_t repeat_interval_ms = 200;

  window_single_click_subscribe(BUTTON_ID_DOWN, (ClickHandler) down_single_click_handler);
  window_single_click_subscribe(BUTTON_ID_UP, (ClickHandler) up_single_click_handler);
  window_single_click_subscribe(BUTTON_ID_SELECT, (ClickHandler) select_single_click_handler);
  window_single_repeating_click_subscribe(BUTTON_ID_UP, repeat_interval_ms, (ClickHandler) up_single_click_handler);
  window_single_repeating_click_subscribe(BUTTON_ID_DOWN, repeat_interval_ms, (ClickHandler) down_single_click_handler);
}

static void horizontal_ruler_update_proc(Layer *layer, GContext *ctx) {
  const GRect bounds = layer_get_bounds(layer);
  // y relative to layer's bounds to support clipping after some vertical scrolling
  const uint8_t yy = 11;

  graphics_context_set_stroke_color(ctx, PBL_IF_COLOR_ELSE(GColorLightGray, GColorBlack));
  graphics_draw_line(ctx, GPoint(0, yy), GPoint(bounds.size.w, yy));
}

static void main_window_load(Window *window) {
  printf("Starting to load window: %zu bytes used", heap_bytes_used());
  Layer *window_layer = window_get_root_layer(window);
  GRect bounds = layer_get_bounds(window_layer);

  s_status_bar = status_bar_layer_create();
  status_bar_layer_set_separator_mode(s_status_bar, StatusBarLayerSeparatorModeNone);
  status_bar_layer_set_colors(s_status_bar, GColorElectricUltramarine, GColorWhite);
  layer_add_child(window_layer, status_bar_layer_get_layer(s_status_bar));

  text_layer_background = text_layer_create(GRect(0, STATUS_BAR_LAYER_HEIGHT, bounds.size.w, 60));
  text_layer_set_background_color(text_layer_background, GColorElectricUltramarine);
  layer_add_child(window_layer, text_layer_get_layer(text_layer_background));

  text_layer_prediction = text_layer_create(GRect(PBL_IF_ROUND_ELSE(30, 10)-2, STATUS_BAR_LAYER_HEIGHT-2, bounds.size.w, 38));
  text_layer_set_text_color(text_layer_prediction, GColorWhite);
  text_layer_set_text(text_layer_prediction, "-");
  text_layer_set_background_color(text_layer_prediction, GColorClear);
  text_layer_set_font(text_layer_prediction, fonts_get_system_font(FONT_KEY_LECO_38_BOLD_NUMBERS));
  text_layer_set_text_alignment(text_layer_prediction, GTextAlignmentLeft);
  layer_add_child(window_layer, text_layer_get_layer(text_layer_prediction));

  text_layer_prediction_label = text_layer_create(GRect(PBL_IF_ROUND_ELSE(30, 10), STATUS_BAR_LAYER_HEIGHT+36, bounds.size.w, 16));
  text_layer_set_text_color(text_layer_prediction_label, GColorWhite);
  text_layer_set_text(text_layer_prediction_label, "MIN LEFT");
  text_layer_set_background_color(text_layer_prediction_label, GColorClear);
  text_layer_set_font(text_layer_prediction_label, fonts_get_system_font(FONT_KEY_GOTHIC_14));
  text_layer_set_text_alignment(text_layer_prediction_label, GTextAlignmentLeft);
  layer_add_child(window_layer, text_layer_get_layer(text_layer_prediction_label));

  text_layer_platform = text_layer_create(GRect(0, STATUS_BAR_LAYER_HEIGHT+4, bounds.size.w-PBL_IF_ROUND_ELSE(30, 10), 32));
  text_layer_set_text_color(text_layer_platform, GColorWhite);
  text_layer_set_text(text_layer_platform, "-");
  text_layer_set_background_color(text_layer_platform, GColorClear);
  text_layer_set_font(text_layer_platform, fonts_get_system_font(FONT_KEY_LECO_32_BOLD_NUMBERS));
  text_layer_set_text_alignment(text_layer_platform, GTextAlignmentRight);
  layer_add_child(window_layer, text_layer_get_layer(text_layer_platform));

  text_layer_platform_label = text_layer_create(GRect(0, STATUS_BAR_LAYER_HEIGHT+36, bounds.size.w-PBL_IF_ROUND_ELSE(30, 10), 16));
  text_layer_set_text_color(text_layer_platform_label, GColorWhite);
  text_layer_set_text(text_layer_platform_label, "PLATFORM");
  text_layer_set_background_color(text_layer_platform_label, GColorClear);
  text_layer_set_font(text_layer_platform_label, fonts_get_system_font(FONT_KEY_GOTHIC_14));
  text_layer_set_text_alignment(text_layer_platform_label, GTextAlignmentRight);
  layer_add_child(window_layer, text_layer_get_layer(text_layer_platform_label));

  text_layer_status = text_layer_create(GRect(0, STATUS_BAR_LAYER_HEIGHT+62, bounds.size.w, 20));
  text_layer_set_text_color(text_layer_status, GColorBlack);
  text_layer_set_text(text_layer_status, "INFO");
  text_layer_set_background_color(text_layer_status, GColorClear);
  text_layer_set_font(text_layer_status, fonts_get_system_font(FONT_KEY_GOTHIC_18_BOLD));
  text_layer_set_text_alignment(text_layer_status, GTextAlignmentCenter);
  layer_add_child(window_layer, text_layer_get_layer(text_layer_status));

  horizontal_ruler_layer = layer_create(GRect(20, STATUS_BAR_LAYER_HEIGHT+78, bounds.size.w - 2 * 20, 20));
  layer_set_update_proc(horizontal_ruler_layer, horizontal_ruler_update_proc);
  layer_add_child(window_layer, horizontal_ruler_layer);

  text_layer_departure_arrival = text_layer_create(GRect(0, STATUS_BAR_LAYER_HEIGHT+94, bounds.size.w, 16));
  text_layer_set_text(text_layer_departure_arrival, "Connecting to phone..");
  text_layer_set_text_color(text_layer_departure_arrival, GColorBlack);
  text_layer_set_background_color(text_layer_departure_arrival, GColorClear);
  text_layer_set_font(text_layer_departure_arrival, fonts_get_system_font(FONT_KEY_GOTHIC_14));
  text_layer_set_text_alignment(text_layer_departure_arrival, GTextAlignmentCenter);
  layer_add_child(window_layer, text_layer_get_layer(text_layer_departure_arrival));

  text_layer_station_to = text_layer_create(GRect(0, STATUS_BAR_LAYER_HEIGHT+112, bounds.size.w, 16));
  text_layer_set_text_color(text_layer_station_to, GColorBlack);
  text_layer_set_background_color(text_layer_station_to, GColorClear);
  text_layer_set_font(text_layer_station_to, fonts_get_system_font(FONT_KEY_GOTHIC_14));
  text_layer_set_text_alignment(text_layer_station_to, GTextAlignmentCenter);
  layer_add_child(window_layer, text_layer_get_layer(text_layer_station_to));

  text_layer_indicator = text_layer_create(GRect(0, STATUS_BAR_LAYER_HEIGHT+134, bounds.size.w, PBL_IF_ROUND_ELSE(22, 18)));
  text_layer_set_text_color(text_layer_indicator, PBL_IF_COLOR_ELSE(GColorBlack, GColorWhite));
  //text_layer_set_text(text_layer_indicator, "1/6");
  text_layer_set_background_color(text_layer_indicator, PBL_IF_COLOR_ELSE(GColorLightGray, GColorBlack));
  text_layer_set_font(text_layer_indicator, fonts_get_system_font(FONT_KEY_GOTHIC_14));
  text_layer_set_text_alignment(text_layer_indicator, GTextAlignmentCenter);
  layer_add_child(window_layer, text_layer_get_layer(text_layer_indicator));

  printf("Window items loaded: %zu bytes used", heap_bytes_used());
}

static void main_window_unload(Window *window) {
  printf("Unloading main window: %zu bytes used", heap_bytes_used());
  text_layer_destroy(text_layer_background);
  text_layer_destroy(text_layer_station_to);
  text_layer_destroy(text_layer_platform);
  text_layer_destroy(text_layer_platform_label);
  text_layer_destroy(text_layer_prediction);
  text_layer_destroy(text_layer_prediction_label);
  text_layer_destroy(text_layer_departure_arrival);
  text_layer_destroy(text_layer_status);
  text_layer_destroy(text_layer_indicator);
  layer_destroy(horizontal_ruler_layer);
  status_bar_layer_destroy(s_status_bar);

  printf("Main window unloaded: %zu bytes used", heap_bytes_used());
}

static void init(void) {
  printf("Initializing app: %zu bytes used", heap_bytes_used());
  // Create main Window element and assign to pointer
  s_main_window = window_create();
  printf("Creating main window: %zu bytes used", heap_bytes_used());

  // Set the background color
  window_set_background_color(s_main_window, PBL_IF_COLOR_ELSE(GColorWhite, GColorWhite));

  // Set handlers to manage the elements inside the Window
  window_set_window_handlers(s_main_window, (WindowHandlers) {
    .load = main_window_load,
    .unload = main_window_unload
  });

  // Show the Window on the watch, with animated=true
  window_stack_push(s_main_window, true);
  printf("Pushing main window: %zu bytes used", heap_bytes_used());

  // Register callbacks
  if(!connection_service_peek_pebble_app_connection()) {
    LOG("Could not fetch data, connection unavailable");
    text_layer_set_text(text_layer_status, "NO CONNECTION");
    text_layer_set_text(text_layer_departure_arrival, "");
    status_bar_layer_set_colors(s_status_bar, GColorChromeYellow, GColorWhite);
    text_layer_set_background_color(text_layer_background, GColorChromeYellow);
    bgcolor_changed = 2;
  } else {
    // Attach our desired button functionality
    text_layer_set_text(text_layer_departure_arrival, "Connection OK");
    window_set_click_config_provider(s_main_window, (ClickConfigProvider) config_provider);
    printf("Window clickprovider loaded: %zu bytes used", heap_bytes_used());
    mqueue_init();
    mqueue_register_handler("TRAIN", message_handler);
    printf("Callbacks registered: %zu bytes used", heap_bytes_used());
    tick_timer_service_subscribe(MINUTE_UNIT, tick_handler);
    printf("Timer service started: %zu bytes used", heap_bytes_used());
    text_layer_set_text(text_layer_departure_arrival, "Fetching geolocation..");
  }
  printf("Connection service: %zu bytes used", heap_bytes_used());
}

static void deinit(void) {
  window_destroy_safe(s_main_window);
  printf("Main window destroyed: %zu bytes used", heap_bytes_used());
  destroy_departures();
  printf("Departures destroyed: %zu bytes used", heap_bytes_used());
  tick_timer_service_unsubscribe();
  printf("Timer destroyed: %zu bytes used", heap_bytes_used());
}

int main(void) {
  init();
  app_event_loop();
  deinit();
}
