<?php
/**
 * Plugin Name: Nashoba Valley Chat Widget
 * Plugin URI: https://nashobawinery.org
 * Description: AI-powered customer support chat widget for Nashoba Valley Winery. Answers questions using your knowledge base.
 * Version: 1.0.0
 * Author: Nashoba Valley Winery
 * Author URI: https://nashobawinery.org
 * License: GPL-2.0+
 * Text Domain: nashoba-chat
 */

if (!defined('ABSPATH')) {
    exit;
}

define('NASHOBA_CHAT_VERSION', '1.0.0');
define('NASHOBA_CHAT_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('NASHOBA_CHAT_PLUGIN_URL', plugin_dir_url(__FILE__));

class Nashoba_Chat_Widget {
    
    private static $instance = null;
    private $options;
    
    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    private function __construct() {
        $this->options = get_option('nashoba_chat_settings', $this->get_defaults());
        
        add_action('admin_menu', array($this, 'add_settings_page'));
        add_action('admin_init', array($this, 'register_settings'));
        add_action('wp_footer', array($this, 'render_widget'), 100);
        add_shortcode('nashoba_chat', array($this, 'shortcode_handler'));
    }
    
    private function get_defaults() {
        return array(
            'enabled' => 1,
            'api_url' => 'https://nashobawinery.org',
            'position' => 'bottom-right',
            'button_color' => '#6366f1',
            'button_color_end' => '#8b5cf6',
            'header_text' => 'Chat with Nashoba Valley',
            'widget_width' => 380,
            'widget_height' => 550,
            'offset_x' => 20,
            'offset_y' => 20,
            'z_index' => 999999,
            'show_on_mobile' => 1,
            'pages_exclude' => '',
        );
    }
    
    public function add_settings_page() {
        add_options_page(
            __('Nashoba Chat Settings', 'nashoba-chat'),
            __('Nashoba Chat', 'nashoba-chat'),
            'manage_options',
            'nashoba-chat-settings',
            array($this, 'render_settings_page')
        );
    }
    
    public function register_settings() {
        register_setting(
            'nashoba_chat_settings_group',
            'nashoba_chat_settings',
            array($this, 'sanitize_settings')
        );
        
        add_settings_section(
            'nashoba_chat_main',
            __('Widget Configuration', 'nashoba-chat'),
            array($this, 'section_main_callback'),
            'nashoba-chat-settings'
        );
        
        add_settings_section(
            'nashoba_chat_appearance',
            __('Appearance', 'nashoba-chat'),
            array($this, 'section_appearance_callback'),
            'nashoba-chat-settings'
        );
        
        add_settings_section(
            'nashoba_chat_advanced',
            __('Advanced', 'nashoba-chat'),
            array($this, 'section_advanced_callback'),
            'nashoba-chat-settings'
        );
    }
    
    public function sanitize_settings($input) {
        $defaults = $this->get_defaults();
        $sanitized = array();
        
        $sanitized['enabled'] = !empty($input['enabled']) ? 1 : 0;
        $sanitized['api_url'] = esc_url_raw(rtrim($input['api_url'] ?? $defaults['api_url'], '/'));
        $sanitized['position'] = sanitize_key($input['position'] ?? $defaults['position']);
        $sanitized['button_color'] = sanitize_hex_color($input['button_color'] ?? $defaults['button_color']);
        $sanitized['button_color_end'] = sanitize_hex_color($input['button_color_end'] ?? $defaults['button_color_end']);
        $sanitized['header_text'] = sanitize_text_field($input['header_text'] ?? $defaults['header_text']);
        $sanitized['widget_width'] = absint($input['widget_width'] ?? $defaults['widget_width']);
        $sanitized['widget_height'] = absint($input['widget_height'] ?? $defaults['widget_height']);
        $sanitized['offset_x'] = absint($input['offset_x'] ?? $defaults['offset_x']);
        $sanitized['offset_y'] = absint($input['offset_y'] ?? $defaults['offset_y']);
        $sanitized['z_index'] = absint($input['z_index'] ?? $defaults['z_index']);
        $sanitized['show_on_mobile'] = !empty($input['show_on_mobile']) ? 1 : 0;
        $sanitized['pages_exclude'] = sanitize_text_field($input['pages_exclude'] ?? '');
        
        return $sanitized;
    }
    
    public function section_main_callback() {
        echo '<p>' . esc_html__('Configure your Nashoba Valley chat widget connection.', 'nashoba-chat') . '</p>';
    }
    
    public function section_appearance_callback() {
        echo '<p>' . esc_html__('Customize how the chat widget looks on your site.', 'nashoba-chat') . '</p>';
    }
    
    public function section_advanced_callback() {
        echo '<p>' . esc_html__('Advanced configuration options.', 'nashoba-chat') . '</p>';
    }
    
    public function render_settings_page() {
        if (!current_user_can('manage_options')) {
            return;
        }
        
        $options = wp_parse_args(get_option('nashoba_chat_settings'), $this->get_defaults());
        ?>
        <div class="wrap">
            <h1><?php echo esc_html(get_admin_page_title()); ?></h1>
            
            <form method="post" action="options.php">
                <?php settings_fields('nashoba_chat_settings_group'); ?>
                
                <h2 class="title"><?php esc_html_e('General Settings', 'nashoba-chat'); ?></h2>
                <table class="form-table">
                    <tr>
                        <th scope="row"><?php esc_html_e('Enable Chat Widget', 'nashoba-chat'); ?></th>
                        <td>
                            <label>
                                <input type="checkbox" name="nashoba_chat_settings[enabled]" value="1" <?php checked($options['enabled'], 1); ?>>
                                <?php esc_html_e('Show chat widget on your site', 'nashoba-chat'); ?>
                            </label>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><?php esc_html_e('API URL', 'nashoba-chat'); ?></th>
                        <td>
                            <input type="url" name="nashoba_chat_settings[api_url]" value="<?php echo esc_attr($options['api_url']); ?>" class="regular-text">
                            <p class="description"><?php esc_html_e('The URL of your Nashoba Valley support system (e.g., https://nashobawinery.org)', 'nashoba-chat'); ?></p>
                        </td>
                    </tr>
                </table>
                
                <h2 class="title"><?php esc_html_e('Position & Size', 'nashoba-chat'); ?></h2>
                <table class="form-table">
                    <tr>
                        <th scope="row"><?php esc_html_e('Widget Position', 'nashoba-chat'); ?></th>
                        <td>
                            <select name="nashoba_chat_settings[position]">
                                <option value="bottom-right" <?php selected($options['position'], 'bottom-right'); ?>><?php esc_html_e('Bottom Right', 'nashoba-chat'); ?></option>
                                <option value="bottom-left" <?php selected($options['position'], 'bottom-left'); ?>><?php esc_html_e('Bottom Left', 'nashoba-chat'); ?></option>
                                <option value="top-right" <?php selected($options['position'], 'top-right'); ?>><?php esc_html_e('Top Right', 'nashoba-chat'); ?></option>
                                <option value="top-left" <?php selected($options['position'], 'top-left'); ?>><?php esc_html_e('Top Left', 'nashoba-chat'); ?></option>
                            </select>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><?php esc_html_e('Offset from Edge', 'nashoba-chat'); ?></th>
                        <td>
                            <label>
                                <?php esc_html_e('Horizontal:', 'nashoba-chat'); ?>
                                <input type="number" name="nashoba_chat_settings[offset_x]" value="<?php echo esc_attr($options['offset_x']); ?>" min="0" max="100" style="width:70px"> px
                            </label>
                            &nbsp;&nbsp;
                            <label>
                                <?php esc_html_e('Vertical:', 'nashoba-chat'); ?>
                                <input type="number" name="nashoba_chat_settings[offset_y]" value="<?php echo esc_attr($options['offset_y']); ?>" min="0" max="100" style="width:70px"> px
                            </label>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><?php esc_html_e('Widget Size', 'nashoba-chat'); ?></th>
                        <td>
                            <label>
                                <?php esc_html_e('Width:', 'nashoba-chat'); ?>
                                <input type="number" name="nashoba_chat_settings[widget_width]" value="<?php echo esc_attr($options['widget_width']); ?>" min="300" max="600" style="width:70px"> px
                            </label>
                            &nbsp;&nbsp;
                            <label>
                                <?php esc_html_e('Height:', 'nashoba-chat'); ?>
                                <input type="number" name="nashoba_chat_settings[widget_height]" value="<?php echo esc_attr($options['widget_height']); ?>" min="400" max="800" style="width:70px"> px
                            </label>
                        </td>
                    </tr>
                </table>
                
                <h2 class="title"><?php esc_html_e('Appearance', 'nashoba-chat'); ?></h2>
                <table class="form-table">
                    <tr>
                        <th scope="row"><?php esc_html_e('Header Text', 'nashoba-chat'); ?></th>
                        <td>
                            <input type="text" name="nashoba_chat_settings[header_text]" value="<?php echo esc_attr($options['header_text']); ?>" class="regular-text">
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><?php esc_html_e('Button Color (Gradient)', 'nashoba-chat'); ?></th>
                        <td>
                            <label>
                                <?php esc_html_e('Start:', 'nashoba-chat'); ?>
                                <input type="color" name="nashoba_chat_settings[button_color]" value="<?php echo esc_attr($options['button_color']); ?>">
                            </label>
                            &nbsp;&nbsp;
                            <label>
                                <?php esc_html_e('End:', 'nashoba-chat'); ?>
                                <input type="color" name="nashoba_chat_settings[button_color_end]" value="<?php echo esc_attr($options['button_color_end']); ?>">
                            </label>
                            <p class="description"><?php esc_html_e('Colors for the gradient on the chat button and header.', 'nashoba-chat'); ?></p>
                        </td>
                    </tr>
                </table>
                
                <h2 class="title"><?php esc_html_e('Advanced Settings', 'nashoba-chat'); ?></h2>
                <table class="form-table">
                    <tr>
                        <th scope="row"><?php esc_html_e('Show on Mobile', 'nashoba-chat'); ?></th>
                        <td>
                            <label>
                                <input type="checkbox" name="nashoba_chat_settings[show_on_mobile]" value="1" <?php checked($options['show_on_mobile'], 1); ?>>
                                <?php esc_html_e('Display widget on mobile devices', 'nashoba-chat'); ?>
                            </label>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><?php esc_html_e('Z-Index', 'nashoba-chat'); ?></th>
                        <td>
                            <input type="number" name="nashoba_chat_settings[z_index]" value="<?php echo esc_attr($options['z_index']); ?>" min="1" max="9999999" style="width:100px">
                            <p class="description"><?php esc_html_e('Controls layering order. Higher values appear on top.', 'nashoba-chat'); ?></p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><?php esc_html_e('Exclude Pages', 'nashoba-chat'); ?></th>
                        <td>
                            <input type="text" name="nashoba_chat_settings[pages_exclude]" value="<?php echo esc_attr($options['pages_exclude']); ?>" class="regular-text">
                            <p class="description"><?php esc_html_e('Comma-separated list of page IDs or slugs to hide the widget on.', 'nashoba-chat'); ?></p>
                        </td>
                    </tr>
                </table>
                
                <h2 class="title"><?php esc_html_e('Shortcode Usage', 'nashoba-chat'); ?></h2>
                <p><?php esc_html_e('You can also embed the chat inline using:', 'nashoba-chat'); ?></p>
                <code>[nashoba_chat]</code>
                <p><?php esc_html_e('Or with custom dimensions:', 'nashoba-chat'); ?></p>
                <code>[nashoba_chat width="400" height="500"]</code>
                
                <?php submit_button(); ?>
            </form>
        </div>
        <?php
    }
    
    private function should_show_widget() {
        if (empty($this->options['enabled'])) {
            return false;
        }
        
        if (!empty($this->options['pages_exclude'])) {
            $excluded = array_map('trim', explode(',', $this->options['pages_exclude']));
            $current_id = get_the_ID();
            $current_slug = get_post_field('post_name', $current_id);
            
            if (in_array($current_id, $excluded) || in_array($current_slug, $excluded)) {
                return false;
            }
        }
        
        return true;
    }
    
    public function render_widget() {
        if (!$this->should_show_widget()) {
            return;
        }
        
        $options = wp_parse_args($this->options, $this->get_defaults());
        $widget_url = esc_url($options['api_url'] . '/support/widget');
        
        $position_styles = $this->get_position_styles($options);
        ?>
        <style>
            #nashoba-chat-widget-container {
                position: fixed;
                <?php echo esc_html($position_styles); ?>
                z-index: <?php echo absint($options['z_index']); ?>;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            }
            
            <?php if (empty($options['show_on_mobile'])): ?>
            @media (max-width: 768px) {
                #nashoba-chat-widget-container { display: none !important; }
            }
            <?php endif; ?>
            
            #nashoba-chat-button {
                width: 60px;
                height: 60px;
                border-radius: 50%;
                background: linear-gradient(135deg, <?php echo esc_attr($options['button_color']); ?> 0%, <?php echo esc_attr($options['button_color_end']); ?> 100%);
                border: none;
                cursor: pointer;
                box-shadow: 0 4px 15px rgba(0,0,0,0.2);
                display: flex;
                align-items: center;
                justify-content: center;
                transition: transform 0.2s, box-shadow 0.2s;
            }
            
            #nashoba-chat-button:hover {
                transform: scale(1.05);
                box-shadow: 0 6px 20px rgba(0,0,0,0.3);
            }
            
            #nashoba-chat-button svg {
                width: 28px;
                height: 28px;
                fill: white;
            }
            
            #nashoba-chat-iframe-container {
                position: absolute;
                <?php echo $this->get_popup_position($options); ?>
                width: <?php echo absint($options['widget_width']); ?>px;
                height: <?php echo absint($options['widget_height']); ?>px;
                background: white;
                border-radius: 16px;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
                overflow: hidden;
                display: none;
                opacity: 0;
                transform: translateY(10px) scale(0.95);
                transition: opacity 0.3s, transform 0.3s;
            }
            
            #nashoba-chat-iframe-container.open {
                display: block;
                opacity: 1;
                transform: translateY(0) scale(1);
            }
            
            #nashoba-chat-iframe-header {
                background: linear-gradient(135deg, <?php echo esc_attr($options['button_color']); ?> 0%, <?php echo esc_attr($options['button_color_end']); ?> 100%);
                color: white;
                padding: 12px 16px;
                display: flex;
                align-items: center;
                justify-content: space-between;
            }
            
            #nashoba-chat-iframe-header h3 {
                margin: 0;
                font-size: 16px;
                font-weight: 600;
            }
            
            #nashoba-chat-close {
                background: rgba(255,255,255,0.2);
                border: none;
                color: white;
                width: 28px;
                height: 28px;
                border-radius: 50%;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 18px;
                transition: background 0.2s;
            }
            
            #nashoba-chat-close:hover {
                background: rgba(255,255,255,0.3);
            }
            
            #nashoba-chat-iframe {
                width: 100%;
                height: calc(100% - 48px);
                border: none;
            }
            
            @media (max-width: 480px) {
                #nashoba-chat-iframe-container {
                    width: calc(100vw - 40px) !important;
                    height: calc(100vh - 100px) !important;
                    bottom: 70px !important;
                    right: 0 !important;
                    left: auto !important;
                    top: auto !important;
                }
            }
        </style>
        
        <div id="nashoba-chat-widget-container">
            <div id="nashoba-chat-iframe-container">
                <div id="nashoba-chat-iframe-header">
                    <h3><?php echo esc_html($options['header_text']); ?></h3>
                    <button id="nashoba-chat-close" aria-label="<?php esc_attr_e('Close chat', 'nashoba-chat'); ?>">&times;</button>
                </div>
                <iframe id="nashoba-chat-iframe" src="<?php echo esc_url($widget_url); ?>"></iframe>
            </div>
            <button id="nashoba-chat-button" aria-label="<?php esc_attr_e('Open chat', 'nashoba-chat'); ?>">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
                </svg>
            </button>
        </div>
        
        <script>
        (function() {
            var chatButton = document.getElementById('nashoba-chat-button');
            var chatContainer = document.getElementById('nashoba-chat-iframe-container');
            var closeButton = document.getElementById('nashoba-chat-close');
            
            if (chatButton && chatContainer) {
                chatButton.addEventListener('click', function() {
                    chatContainer.classList.toggle('open');
                });
            }
            
            if (closeButton && chatContainer) {
                closeButton.addEventListener('click', function() {
                    chatContainer.classList.remove('open');
                });
            }
            
            document.addEventListener('keydown', function(e) {
                if (e.key === 'Escape' && chatContainer) {
                    chatContainer.classList.remove('open');
                }
            });
        })();
        </script>
        <?php
    }
    
    private function get_position_styles($options) {
        $offset_x = absint($options['offset_x']);
        $offset_y = absint($options['offset_y']);
        
        switch ($options['position']) {
            case 'bottom-left':
                return "bottom: {$offset_y}px; left: {$offset_x}px;";
            case 'top-right':
                return "top: {$offset_y}px; right: {$offset_x}px;";
            case 'top-left':
                return "top: {$offset_y}px; left: {$offset_x}px;";
            default:
                return "bottom: {$offset_y}px; right: {$offset_x}px;";
        }
    }
    
    private function get_popup_position($options) {
        switch ($options['position']) {
            case 'bottom-left':
                return "bottom: 70px; left: 0;";
            case 'top-right':
                return "top: 70px; right: 0;";
            case 'top-left':
                return "top: 70px; left: 0;";
            default:
                return "bottom: 70px; right: 0;";
        }
    }
    
    public function shortcode_handler($atts) {
        $atts = shortcode_atts(array(
            'width' => $this->options['widget_width'] ?? 380,
            'height' => $this->options['widget_height'] ?? 550,
        ), $atts);
        
        $api_url = $this->options['api_url'] ?? 'https://nashobawinery.org';
        $widget_url = esc_url($api_url . '/support/widget');
        
        return sprintf(
            '<iframe src="%s" style="width:%dpx;height:%dpx;border:none;border-radius:12px;box-shadow:0 4px 15px rgba(0,0,0,0.1);"></iframe>',
            $widget_url,
            absint($atts['width']),
            absint($atts['height'])
        );
    }
}

register_activation_hook(__FILE__, function() {
    add_option('nashoba_chat_settings', array(
        'enabled' => 1,
        'api_url' => 'https://nashobawinery.org',
        'position' => 'bottom-right',
        'button_color' => '#6366f1',
        'button_color_end' => '#8b5cf6',
        'header_text' => 'Chat with Nashoba Valley',
        'widget_width' => 380,
        'widget_height' => 550,
        'offset_x' => 20,
        'offset_y' => 20,
        'z_index' => 999999,
        'show_on_mobile' => 1,
        'pages_exclude' => '',
    ));
});

add_action('plugins_loaded', array('Nashoba_Chat_Widget', 'get_instance'));
