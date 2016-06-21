#include <pebble.h>
#include "libs/pebble-assist/pebble-assist.h"
#include "libs/data-processor/data-processor.h"

#define KEY_OPERATION 10000
#define KEY_DATA 10001
#define KEY_OUTBOX 10002

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

bool train_departure_is_ok(TrainDeparture* departure) {
        bool status_ok = false;
        status_ok = status_ok || strcmp(departure->status, "ON TIME") == 0;
        status_ok = status_ok || strcmp(departure->status, "STARTS HERE") == 0;
        status_ok = status_ok || strcmp(departure->status, "EARLY") == 0;
        status_ok = status_ok || strcmp(departure->status, "NO REPORT") == 0;
        return status_ok;
        printf("Train departure bool: %zu bytes used", heap_bytes_used());
}

void update_text(void) {
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
        printf("Text updated: %zu bytes used", heap_bytes_used());
}

void down_single_click_handler(ClickRecognizerRef recognizer, Window *window) {
        //printf("%i / %i", pos + 2, num_departures);
        if (pos + 2 <= num_departures) {
                pos += 1;
                update_text();
        }
}

void destroy_departures(void) {
        for (uint8_t d = 0; d < num_departures; d += 1) {
                free_safe(departures[d]->destination);
                free_safe(departures[d]->est_time);
                free_safe(departures[d]);
        }
        free_safe(departures);
        num_departures = 0;
        printf("Departures destroyed: %zu bytes used", heap_bytes_used());
}


void select_single_click_handler(ClickRecognizerRef recognizer, Window *window) {
        printf("Data refresh started: %zu bytes used", heap_bytes_used());
        destroy_departures();
        // Declare the dictionary's iterator
        DictionaryIterator *out_iter;

        // Prepare the outbox buffer for this message
        AppMessageResult result = app_message_outbox_begin(&out_iter);
        if(result == APP_MSG_OK) {
                // Add an item to ask for weather data
                int value = 0;
                dict_write_int(out_iter, KEY_OUTBOX, &value, sizeof(int), true);
                text_layer_set_text(text_layer_status, "REFRESHING");

                // Send this message
                dict_write_end(out_iter);
                result = app_message_outbox_send();
                if(result != APP_MSG_OK) {
                        APP_LOG(APP_LOG_LEVEL_ERROR, "Error sending the outbox: %d", (int)result);
                }
        } else {
                // The outbox cannot be used right now
                APP_LOG(APP_LOG_LEVEL_ERROR, "Error preparing the outbox: %d", (int)result);
        }
        printf("Data refresh complete: %zu bytes used", heap_bytes_used());
}

void up_single_click_handler(ClickRecognizerRef recognizer, Window *window) {
        if (pos - 1 >= 0) {
                pos -= 1;
                update_text();
        }
}

void config_provider(Window *window) {
        const uint16_t repeat_interval_ms = 200;

        window_single_click_subscribe(BUTTON_ID_DOWN, (ClickHandler) down_single_click_handler);
        window_single_click_subscribe(BUTTON_ID_UP, (ClickHandler) up_single_click_handler);
        window_single_click_subscribe(BUTTON_ID_SELECT, (ClickHandler) select_single_click_handler);
        window_single_repeating_click_subscribe(BUTTON_ID_UP, repeat_interval_ms, (ClickHandler) up_single_click_handler);
        window_single_repeating_click_subscribe(BUTTON_ID_DOWN, repeat_interval_ms, (ClickHandler) down_single_click_handler);
}

void inbox_received_callback(DictionaryIterator *iterator, void *context) {
        printf("Inbox receive callback start: %zu bytes used", heap_bytes_used());
        char* operation = dict_find(iterator, KEY_OPERATION)->value->cstring;
        data_processor_init(operation, '|');
        printf("%s", operation);

        char* data = dict_find(iterator, KEY_DATA)->value->cstring;
        data_processor_init(data, '|');

        if (strcmp(operation, "ERROR") == 0) {
                APP_LOG(APP_LOG_LEVEL_ERROR, operation);
                APP_LOG(APP_LOG_LEVEL_ERROR, data);
                text_layer_set_text(text_layer_status, "\U0001F635 \U0001F525 ERROR \U0001F525 \U0001F635");
                text_layer_set_text(text_layer_departure_arrival, data);
        } else if (strcmp(operation, "CONFIG") == 0) {
                APP_LOG(APP_LOG_LEVEL_ERROR, operation);
                APP_LOG(APP_LOG_LEVEL_ERROR, data);
        } else {
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
                text_layer_set_text(text_layer_status, "DATA LOADED");
                update_text();
        }
        printf("Inbox receive callback end: %zu bytes used", heap_bytes_used());
}

static void inbox_dropped_callback(AppMessageResult reason, void *context) {
        APP_LOG(APP_LOG_LEVEL_ERROR, "Message dropped!");
        text_layer_set_text(text_layer_status, "CONNECTION FAILED");
}

static void outbox_failed_callback(DictionaryIterator *iterator, AppMessageResult reason, void *context) {
        APP_LOG(APP_LOG_LEVEL_ERROR, "Outbox send failed!");
}

static void outbox_sent_callback(DictionaryIterator *iterator, void *context) {
        APP_LOG(APP_LOG_LEVEL_INFO, "Outbox send success!");
}

static void horizontal_ruler_update_proc(Layer *layer, GContext *ctx) {
        const GRect bounds = layer_get_bounds(layer);
        // y relative to layer's bounds to support clipping after some vertical scrolling
        const int16_t yy = 11;

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

        text_layer_prediction = text_layer_create(GRect(PBL_IF_ROUND_ELSE(30, 10), STATUS_BAR_LAYER_HEIGHT, bounds.size.w, 36));
        text_layer_set_text_color(text_layer_prediction, GColorWhite);
        text_layer_set_text(text_layer_prediction, "-");
        text_layer_set_background_color(text_layer_prediction, GColorClear);
        text_layer_set_font(text_layer_prediction, fonts_get_system_font(FONT_KEY_LECO_36_BOLD_NUMBERS));
        text_layer_set_text_alignment(text_layer_prediction, GTextAlignmentLeft);
        layer_add_child(window_layer, text_layer_get_layer(text_layer_prediction));

        text_layer_prediction_label = text_layer_create(GRect(PBL_IF_ROUND_ELSE(30, 10), STATUS_BAR_LAYER_HEIGHT+36, bounds.size.w, 16));
        text_layer_set_text_color(text_layer_prediction_label, GColorWhite);
        text_layer_set_text(text_layer_prediction_label, "MIN LEFT");
        text_layer_set_background_color(text_layer_prediction_label, GColorClear);
        text_layer_set_font(text_layer_prediction_label, fonts_get_system_font(FONT_KEY_GOTHIC_14));
        text_layer_set_text_alignment(text_layer_prediction_label, GTextAlignmentLeft);
        layer_add_child(window_layer, text_layer_get_layer(text_layer_prediction_label));

        text_layer_platform = text_layer_create(GRect(0, STATUS_BAR_LAYER_HEIGHT, bounds.size.w-PBL_IF_ROUND_ELSE(30, 10), 36));
        text_layer_set_text_color(text_layer_platform, GColorWhite);
        text_layer_set_text(text_layer_platform, "-");
        text_layer_set_background_color(text_layer_platform, GColorClear);
        text_layer_set_font(text_layer_platform, fonts_get_system_font(FONT_KEY_LECO_36_BOLD_NUMBERS));
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
        text_layer_set_text(text_layer_status, "LOADING");
        text_layer_set_background_color(text_layer_status, GColorClear);
        text_layer_set_font(text_layer_status, fonts_get_system_font(FONT_KEY_GOTHIC_18_BOLD));
        text_layer_set_text_alignment(text_layer_status, GTextAlignmentCenter);
        layer_add_child(window_layer, text_layer_get_layer(text_layer_status));

        horizontal_ruler_layer = layer_create(GRect(20, STATUS_BAR_LAYER_HEIGHT+78, bounds.size.w - 2 * 20, 20));
        layer_set_update_proc(horizontal_ruler_layer, horizontal_ruler_update_proc);
        layer_add_child(window_layer, horizontal_ruler_layer);

        text_layer_departure_arrival = text_layer_create(GRect(0, STATUS_BAR_LAYER_HEIGHT+94, bounds.size.w, 16));
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

        text_layer_indicator = text_layer_create(GRect(0, STATUS_BAR_LAYER_HEIGHT+134, bounds.size.w, PBL_IF_ROUND_ELSE(20, 18)));
        text_layer_set_text_color(text_layer_indicator, GColorBlack);
        //text_layer_set_text(text_layer_indicator, "1/6");
        text_layer_set_background_color(text_layer_indicator, GColorLightGray);
        text_layer_set_font(text_layer_indicator, fonts_get_system_font(FONT_KEY_GOTHIC_14));
        text_layer_set_text_alignment(text_layer_indicator, GTextAlignmentCenter);
        layer_add_child(window_layer, text_layer_get_layer(text_layer_indicator));
        printf("Window items loaded: %zu bytes used", heap_bytes_used());

        // Attach our desired button functionality
        window_set_click_config_provider(window, (ClickConfigProvider) config_provider);
        printf("Window clickprovider loaded: %zu bytes used", heap_bytes_used());
}

static void main_window_unload(Window *window) {
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
        if(connection_service_peek_pebble_app_connection()) {
                printf("Registering callbacks: %zu bytes used", heap_bytes_used());
                app_message_register_inbox_received(inbox_received_callback);
                app_message_register_inbox_dropped(inbox_dropped_callback);
                app_message_register_outbox_failed(outbox_failed_callback);
                app_message_register_outbox_sent(outbox_sent_callback);

                // Open AppMessage
                app_message_open_max();
                printf("Callbacks registered: %zu bytes used", heap_bytes_used());
        } else {
                APP_LOG(APP_LOG_LEVEL_ERROR, "Could not fetch data, connection unavailable");
                text_layer_set_text(text_layer_status, "NO CONNECTION");
        }
        printf("Connection service: %zu bytes used", heap_bytes_used());
}

static void deinit(void) {
        window_destroy(s_main_window);
        destroy_departures();
        connection_service_unsubscribe();
}

int main(void) {
        init();
        app_event_loop();
        deinit();
}
